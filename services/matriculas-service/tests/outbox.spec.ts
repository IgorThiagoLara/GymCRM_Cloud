import jwt from "jsonwebtoken";
import request from "supertest";
import { buildApp } from "../src/main";
import { DomainEvent } from "../src/shared/events/DomainEvent";
import { IEventPublisher } from "../src/shared/events/IEventPublisher";
import { OutboxEventPublisher } from "../src/shared/messaging/OutboxEventPublisher";
import { OutboxRelay } from "../src/shared/messaging/OutboxRelay";
import { InMemoryEventLogQuery, InMemoryOutboxStore } from "../src/shared/persistence/InMemoryEventStores";

const SECRET = "test-secret";
const auth = { Authorization: `Bearer ${jwt.sign({ sub: "u1", tenantId: "academia-a", perfil: "ADMIN" }, SECRET)}` };
const body = { alunoId: "aluno-1", turmaId: "t1", planoId: "plano-mensal" };

describe("matriculas-service: outbox + relay", () => {
  it("criar matrícula grava o evento na outbox (com eventId/correlationId) sem depender do broker", async () => {
    const outbox = new InMemoryOutboxStore();
    const app = buildApp({ jwtSecret: SECRET, events: new OutboxEventPublisher(outbox, "t"), eventLog: new InMemoryEventLogQuery(outbox) });
    const res = await request(app).post("/matriculas").set(auth).send(body);
    expect(res.status).toBe(201);
    expect(outbox.rows).toHaveLength(1);
    expect(outbox.rows[0].name).toBe("MatriculaCriada");
    expect(outbox.rows[0].id).toBe(outbox.rows[0].correlationId);
    expect(outbox.rows[0].publicadoEm).toBeNull();

    const log = await request(app).get("/eventos").set(auth);
    expect(log.status).toBe(200);
    expect(log.body[0]).toMatchObject({ name: "MatriculaCriada", direcao: "PUBLICACAO", status: "PENDENTE", servico: "matriculas" });
  });

  it("broker fora do ar: evento continua PENDENTE e é entregue quando o broker volta (nada se perde)", async () => {
    const outbox = new InMemoryOutboxStore();
    await new OutboxEventPublisher(outbox, "t").publish({
      eventId: "e1", correlationId: "e1", name: "MatriculaCriada", occurredAt: new Date(), tenantId: "academia-a",
    } as DomainEvent);

    let brokerNoAr = false;
    const entregues: DomainEvent[] = [];
    const broker: IEventPublisher = {
      publish: async (e) => { if (!brokerNoAr) throw new Error("broker indisponível"); entregues.push(e); },
    };
    const relay = new OutboxRelay(outbox, broker, "t");
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    expect(await relay.drenarUmaVez()).toBe(0);
    expect(outbox.rows[0].publicadoEm).toBeNull();
    expect(outbox.rows[0].erro).toBe("broker indisponível");

    brokerNoAr = true;
    expect(await relay.drenarUmaVez()).toBe(1);
    spy.mockRestore();
    expect(entregues).toHaveLength(1);
    expect(entregues[0].eventId).toBe("e1");
    expect(outbox.rows[0].publicadoEm).not.toBeNull();
  });
});
