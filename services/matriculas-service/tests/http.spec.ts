import jwt from "jsonwebtoken";
import request from "supertest";
import { buildApp } from "../src/main";
import { DomainEvent } from "../src/shared/events/DomainEvent";
import { InMemoryEventBus } from "../src/shared/events/InMemoryEventBus";
import { UpstreamUnavailableError } from "../src/shared/http/UpstreamError";

const SECRET = "test-secret";
const token = (tenantId: string, perfil: string) => jwt.sign({ sub: "u1", tenantId, perfil }, SECRET);
const body = { alunoId: "aluno-1", turmaId: "t1", planoId: "plano-mensal" };

function novoApp() {
  const bus = new InMemoryEventBus();
  const publicados: DomainEvent[] = [];
  bus.subscribe("MatriculaCriada", { handle: async (e) => { publicados.push(e); } });
  return { app: buildApp({ jwtSecret: SECRET, events: bus }), publicados };
}

describe("matriculas-service HTTP", () => {
  it("401 sem token", async () => {
    expect((await request(novoApp().app).post("/matriculas").send(body)).status).toBe(401);
  });

  it("403 para perfil ALUNO (RBAC)", async () => {
    const res = await request(novoApp().app).post("/matriculas")
      .set("Authorization", `Bearer ${token("academia-a", "ALUNO")}`).send(body);
    expect(res.status).toBe(403);
  });

  it("400 com corpo inválido", async () => {
    const res = await request(novoApp().app).post("/matriculas")
      .set("Authorization", `Bearer ${token("academia-a", "ADMIN")}`).send({ alunoId: "" });
    expect(res.status).toBe(400);
  });

  it("201 e publica o evento MatriculaCriada (consumido pelo financeiro)", async () => {
    const { app, publicados } = novoApp();
    const res = await request(app).post("/matriculas")
      .set("Authorization", `Bearer ${token("academia-a", "RECEPCIONISTA")}`).send(body);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("ATIVA");
    expect(publicados).toHaveLength(1);
    expect(publicados[0].name).toBe("MatriculaCriada");
  });

  it("404 quando o aluno pertence a outro tenant (isolamento)", async () => {
    const res = await request(novoApp().app).post("/matriculas")
      .set("Authorization", `Bearer ${token("academia-b", "ADMIN")}`).send(body);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("ALUNO_NAO_ENCONTRADO");
  });

  it("409 na segunda matrícula ativa do mesmo aluno", async () => {
    const { app } = novoApp();
    const auth = `Bearer ${token("academia-a", "ADMIN")}`;
    await request(app).post("/matriculas").set("Authorization", auth).send(body);
    const res = await request(app).post("/matriculas").set("Authorization", auth).send(body);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("MATRICULA_DUPLICADA");
  });

  it("GET /matriculas lista só as do tenant do token", async () => {
    const { app } = novoApp();
    await request(app).post("/matriculas").set("Authorization", `Bearer ${token("academia-a", "ADMIN")}`).send(body);
    const a = await request(app).get("/matriculas").set("Authorization", `Bearer ${token("academia-a", "ADMIN")}`);
    const b = await request(app).get("/matriculas").set("Authorization", `Bearer ${token("academia-b", "ADMIN")}`);
    expect(a.status).toBe(200);
    expect(a.body).toHaveLength(1);
    expect(a.body[0].alunoId).toBe("aluno-1");
    expect(b.body).toHaveLength(0);
  });

  it("503 (e não queda do processo) quando o cadastros-service está indisponível", async () => {
    const app = buildApp({
      jwtSecret: SECRET,
      alunoReader: { obter: async () => { throw new UpstreamUnavailableError("cadastros", "ECONNREFUSED"); } },
    });
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app).post("/matriculas")
      .set("Authorization", `Bearer ${token("academia-a", "ADMIN")}`).send(body);
    spy.mockRestore();
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("SERVICO_INDISPONIVEL");
  });
});
