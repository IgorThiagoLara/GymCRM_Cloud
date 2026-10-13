import jwt from "jsonwebtoken";
import request from "supertest";
import { buildApp } from "../src/main";
import { INotificationSender, Mensagem } from "../src/features/notificacoes/enviar-email/application/INotificationSender";
import { InMemoryEventBus } from "../src/shared/events/InMemoryEventBus";

const SECRET = "test-secret";
const token = (tenantId: string) => jwt.sign({ sub: "u1", tenantId, perfil: "ADMIN" }, SECRET);
const cobrancaGerada = (tenantId: string) => ({
  name: "CobrancaGerada", occurredAt: new Date().toISOString(), tenantId,
  cobrancaId: "c1", matriculaId: "m1", alunoEmail: "maria@x.com", valor: 99.9, vencimento: new Date(Date.now() + 30 * 864e5).toISOString(),
});

describe("notificacoes-service", () => {
  it("CobrancaGerada (JSON do broker) => envia e-mail e registra histórico por tenant", async () => {
    const enviados: Mensagem[] = [];
    const sender: INotificationSender = { enviar: async (m) => { enviados.push(m); } };
    const bus = new InMemoryEventBus();
    const app = buildApp({ jwtSecret: SECRET, bus, emailSender: sender });

    await bus.publish(cobrancaGerada("academia-a") as any);

    expect(enviados).toHaveLength(1);
    expect(enviados[0].destinatario).toBe("maria@x.com");
    expect(enviados[0].corpo).toContain("R$ 99.90");

    const a = await request(app).get("/notificacoes").set("Authorization", `Bearer ${token("academia-a")}`);
    const b = await request(app).get("/notificacoes").set("Authorization", `Bearer ${token("academia-b")}`);
    expect(a.body).toHaveLength(1);
    expect(a.body[0].status).toBe("ENVIADA");
    expect(b.body).toHaveLength(0);
  });

  it("falha no provedor registra FALHA e relança (para o broker enviar à DLQ)", async () => {
    const quebrado: INotificationSender = { enviar: async () => { throw new Error("smtp fora do ar"); } };
    const handlers: any[] = [];
    const bus = { subscribe: (_n: string, h: any) => { handlers.push(h); } };
    const app = buildApp({ jwtSecret: SECRET, bus, emailSender: quebrado });

    await expect(handlers[0].handle(cobrancaGerada("academia-a"))).rejects.toThrow("smtp fora do ar");
    const res = await request(app).get("/notificacoes").set("Authorization", `Bearer ${token("academia-a")}`);
    expect(res.body[0].status).toBe("FALHA");
  });
});

describe("notificacoes-service: EDA endurecido", () => {
  const silencio = () => jest.spyOn(console, "log").mockImplementation(() => {});
  const evento = (eventId: string) => ({ ...cobrancaGerada("academia-a"), eventId, correlationId: "corr-1" });

  it("evento duplicado envia UM e-mail só (idempotência)", async () => {
    const spy = silencio();
    const enviados: Mensagem[] = [];
    const bus = new InMemoryEventBus();
    buildApp({ jwtSecret: SECRET, bus, emailSender: { enviar: async (m) => { enviados.push(m); } } });
    await bus.publish(evento("e-1") as any);
    await bus.publish(evento("e-1") as any);
    spy.mockRestore();
    expect(enviados).toHaveLength(1);
    expect(enviados[0].referencia).toBe("e-1"); 
    expect(enviados[0].correlationId).toBe("corr-1");
  });

  it("falha do provedor -> FALHA; redelivery do broker -> ENVIADA; monitor mostra 2 tentativas", async () => {
    const spy = silencio();
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});
    let quebrado = true;
    const sender: INotificationSender = { enviar: async () => { if (quebrado) throw new Error("smtp fora"); } };
    const bus = new InMemoryEventBus();
    const app = buildApp({ jwtSecret: SECRET, bus, emailSender: sender });

    await bus.publish(evento("e-2") as any);
    let log = await request(app).get("/eventos").set("Authorization", `Bearer ${token("academia-a")}`);
    expect(log.body[0]).toMatchObject({ status: "FALHA", erro: "smtp fora" });

    quebrado = false;
    await bus.publish(evento("e-2") as any);
    log = await request(app).get("/eventos").set("Authorization", `Bearer ${token("academia-a")}`);
    const hist = await request(app).get("/notificacoes").set("Authorization", `Bearer ${token("academia-a")}`);
    spy.mockRestore(); erro.mockRestore();
    expect(log.body[0]).toMatchObject({ status: "PROCESSADO", tentativas: 2, servico: "notificacoes" });
    expect(hist.body.map((n: any) => n.status).sort()).toEqual(["ENVIADA", "FALHA"]);
  });
});
