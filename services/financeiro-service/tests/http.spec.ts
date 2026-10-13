import jwt from "jsonwebtoken";
import request from "supertest";
import { buildApp } from "../src/main";
import { InMemoryEventBus } from "../src/shared/events/InMemoryEventBus";

const SECRET = "test-secret";
const token = (tenantId: string, perfil = "ADMIN") => jwt.sign({ sub: "u1", tenantId, perfil }, SECRET);

describe("financeiro-service HTTP", () => {
  it("evento MatriculaCriada => GET /cobrancas mostra a cobrança (somente do tenant)", async () => {
    const bus = new InMemoryEventBus();
    const app = buildApp({ jwtSecret: SECRET, bus });
    await bus.publish({ name: "MatriculaCriada", occurredAt: new Date(), tenantId: "academia-a", matriculaId: "m1", alunoEmail: "m@x.com", valor: 99.9 } as any);

    const a = await request(app).get("/cobrancas").set("Authorization", `Bearer ${token("academia-a")}`);
    const b = await request(app).get("/cobrancas").set("Authorization", `Bearer ${token("academia-b")}`);
    expect(a.status).toBe(200);
    expect(a.body).toHaveLength(1);
    expect(a.body[0]).toMatchObject({ matriculaId: "m1", valor: 99.9, status: "PENDENTE" });
    expect(b.body).toHaveLength(0);
  });

  it("401 sem token e 403 para ALUNO", async () => {
    const app = buildApp({ jwtSecret: SECRET });
    expect((await request(app).get("/cobrancas")).status).toBe(401);
    expect((await request(app).get("/cobrancas").set("Authorization", `Bearer ${token("academia-a", "ALUNO")}`)).status).toBe(403);
  });
});
