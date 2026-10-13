import jwt from "jsonwebtoken";
import request from "supertest";
import { buildApp } from "../src/main";
import { InMemoryEventBus } from "../src/shared/events/InMemoryEventBus";
import { DomainEvent } from "../src/shared/events/DomainEvent";

const SECRET = "test-secret";
const auth = { Authorization: `Bearer ${jwt.sign({ sub: "u1", tenantId: "academia-a", perfil: "ADMIN" }, SECRET)}` };
const matriculaCriada = (eventId: string, valor = 99.9) => ({
  eventId, correlationId: eventId, name: "MatriculaCriada", occurredAt: new Date().toISOString(),
  tenantId: "academia-a", matriculaId: "m1", alunoId: "a1", alunoEmail: "m@x.com", planoId: "p1", valor,
});
const silencio = () => jest.spyOn(console, "log").mockImplementation(() => {});

describe("financeiro-service: consumidor idempotente", () => {
  it("o MESMO evento entregue 2x (at-least-once) gera UMA cobrança", async () => {
    const spy = silencio();
    const bus = new InMemoryEventBus();
    const app = buildApp({ jwtSecret: SECRET, bus });
    await bus.publish(matriculaCriada("evt-1") as unknown as DomainEvent);
    await bus.publish(matriculaCriada("evt-1") as unknown as DomainEvent);
    const res = await request(app).get("/cobrancas").set(auth);
    spy.mockRestore();
    expect(res.body).toHaveLength(1);
  });

  it("eventos DIFERENTES geram cobranças diferentes", async () => {
    const spy = silencio();
    const bus = new InMemoryEventBus();
    const app = buildApp({ jwtSecret: SECRET, bus });
    await bus.publish(matriculaCriada("evt-1") as unknown as DomainEvent);
    await bus.publish(matriculaCriada("evt-2") as unknown as DomainEvent);
    const res = await request(app).get("/cobrancas").set(auth);
    spy.mockRestore();
    expect(res.body).toHaveLength(2);
  });

  it("monitor de eventos: consumo registrado como PROCESSADO e cobrança herda o correlationId", async () => {
    const spy = silencio();
    const publicados: any[] = [];
    const bus = new InMemoryEventBus();
    bus.subscribe("CobrancaGerada", { handle: async (e) => { publicados.push(e); } });
    const app = buildApp({ jwtSecret: SECRET, bus });
    await bus.publish(matriculaCriada("evt-9") as unknown as DomainEvent);
    const log = await request(app).get("/eventos").set(auth);
    spy.mockRestore();
    expect(log.body[0]).toMatchObject({ eventId: "evt-9", direcao: "CONSUMO", status: "PROCESSADO", servico: "financeiro" });
    expect(publicados[0].correlationId).toBe("evt-9");
    expect(publicados[0].eventId === "evt-9").toBe(false);
  });

  it("falha no processamento fica FALHA e pode ser reprocessada (retry) sem duplicar", async () => {
    const spy = silencio();
    const bus = new InMemoryEventBus();
    let falhar = true;
    const repoQuebravel = {
      save: async () => { if (falhar) throw new Error("banco indisponível"); },
      findByMatricula: async () => [],
    };
    const app = buildApp({ jwtSecret: SECRET, bus, cobrancas: repoQuebravel as any });
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});

    await bus.publish(matriculaCriada("evt-7") as unknown as DomainEvent);
    let log = await request(app).get("/eventos").set(auth);
    expect(log.body[0].status).toBe("FALHA");

    falhar = false;
    await bus.publish(matriculaCriada("evt-7") as unknown as DomainEvent);
    log = await request(app).get("/eventos").set(auth);
    spy.mockRestore(); erro.mockRestore();
    expect(log.body[0].status).toBe("PROCESSADO");
    expect(log.body[0].tentativas).toBe(2);
  });
});
