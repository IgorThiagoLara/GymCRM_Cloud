import jwt from "jsonwebtoken";
import request from "supertest";
import { buildApp } from "../src/main";

const SECRET = "test-secret";
const token = (tenantId: string, perfil = "RECEPCIONISTA") => jwt.sign({ sub: "u1", tenantId, perfil }, SECRET);
const app = () => buildApp({ jwtSecret: SECRET });

describe("cadastros-service", () => {
  it("401 sem token", async () => {
    expect((await request(app()).get("/alunos")).status).toBe(401);
  });

  it("lista apenas alunos do tenant do token (isolamento multi-tenant)", async () => {
    const res = await request(app()).get("/alunos").set("Authorization", `Bearer ${token("academia-a")}`);
    expect(res.status).toBe(200);
    expect(res.body.map((a: any) => a.id).sort()).toEqual(["aluno-1", "aluno-3"]);
  });

  it("404 ao buscar aluno de outro tenant", async () => {
    const res = await request(app()).get("/alunos/aluno-2").set("Authorization", `Bearer ${token("academia-a")}`);
    expect(res.status).toBe(404);
  });

  it("403 para perfil ALUNO", async () => {
    const res = await request(app()).get("/planos").set("Authorization", `Bearer ${token("academia-a", "ALUNO")}`);
    expect(res.status).toBe(403);
  });

  it("retorna plano com valor numérico", async () => {
    const res = await request(app()).get("/planos/plano-mensal").set("Authorization", `Bearer ${token("academia-a")}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "plano-mensal", nome: "Mensal", valor: 99.9, duracaoMeses: 1 });
  });
});
