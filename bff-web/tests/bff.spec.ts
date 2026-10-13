import jwt from "jsonwebtoken";
import request from "supertest";
import { UpstreamError } from "../src/clients/HttpJson";
import { buildApp } from "../src/main";
import { Downstream } from "../src/types";

const SECRET = "test-secret";
const token = (perfil = "RECEPCIONISTA") => jwt.sign({ sub: "u1", tenantId: "academia-a", perfil }, SECRET);
const auth = (perfil?: string) => ({ Authorization: `Bearer ${token(perfil)}` });

function fakes(over: Partial<Downstream> = {}): Downstream {
  return {
    cadastros: {
      alunos: async () => [{ id: "a1", nome: "Maria", email: "m@x.com" }],
      planos: async () => [{ id: "p1", nome: "Mensal", valor: 99.9, duracaoMeses: 1 }],
    },
    matriculas: {
      listar: async () => [{ id: "m1", alunoId: "a1", turmaId: "t1", planoId: "p1", status: "ATIVA", dataInicio: "2026-10-01T00:00:00Z", dataFim: "2026-11-01T00:00:00Z" }],
      criar: async () => ({ status: 201, body: { matriculaId: "m1" } }),
      eventos: async () => [],
    },
    financeiro: { cobrancas: async () => [{ id: "c1", matriculaId: "m1", valor: 99.9, vencimento: "2026-11-01T00:00:00Z", status: "PENDENTE" }], eventos: async () => [] },
    notificacoes: { listar: async () => [], eventos: async () => [] },
    ...over,
  };
}
const app = (d = fakes()) => buildApp({ jwtSecret: SECRET, downstream: d });

describe("BFF web", () => {
  it("login devolve JWT com tenant e perfil; credencial inválida => 401", async () => {
    const ok = await request(app()).post("/auth/login").send({ email: "recepcao@academia-a.com", senha: "recepcao123" });
    expect(ok.status).toBe(200);
    const claims = jwt.verify(ok.body.token, SECRET) as any;
    expect(claims.tenantId).toBe("academia-a");
    expect(claims.perfil).toBe("RECEPCIONISTA");
    const ruim = await request(app()).post("/auth/login").send({ email: "recepcao@academia-a.com", senha: "errada" });
    expect(ruim.status).toBe(401);
  });

  it("401 sem token; 403 para perfil sem permissão", async () => {
    expect((await request(app()).get("/api/matriculas")).status).toBe(401);
    expect((await request(app()).get("/api/matriculas").set(auth("ALUNO"))).status).toBe(403);
  });

  it("GET /api/matriculas compõe matrícula + aluno + plano + cobrança em uma resposta", async () => {
    const res = await request(app()).get("/api/matriculas").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.degradado).toEqual([]);
    expect(res.body.itens[0]).toMatchObject({ id: "m1", status: "ATIVA" });
    expect(res.body.itens[0].aluno.nome).toBe("Maria");
    expect(res.body.itens[0].plano.nome).toBe("Mensal");
    expect(res.body.itens[0].cobranca.status).toBe("PENDENTE");
  });

  it("degradação graciosa: financeiro fora do ar => 200 com cobranca nula e degradado=['financeiro']", async () => {
    const d = fakes({ financeiro: { cobrancas: async () => { throw new UpstreamError("financeiro", "timeout"); }, eventos: async () => [] } });
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const res = await request(app(d)).get("/api/matriculas").set(auth());
    spy.mockRestore();
    expect(res.status).toBe(200);
    expect(res.body.degradado).toEqual(["financeiro"]);
    expect(res.body.itens[0].cobranca).toBeNull();
    expect(res.body.itens[0].aluno.nome).toBe("Maria");
  });

  it("fonte principal fora do ar (matrículas) => 502", async () => {
    const d = fakes({ matriculas: { listar: async () => { throw new UpstreamError("matriculas", "ECONNREFUSED"); }, criar: async () => ({ status: 500, body: null }), eventos: async () => [] } });
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app(d)).get("/api/matriculas").set(auth());
    spy.mockRestore();
    expect(res.status).toBe(502);
    expect(res.body.servico).toBe("matriculas");
  });

  it("POST /api/matriculas valida o corpo e repassa o status do serviço (409 duplicada)", async () => {
    expect((await request(app()).post("/api/matriculas").set(auth()).send({})).status).toBe(400);
    const d = fakes({ matriculas: { listar: async () => [], criar: async () => ({ status: 409, body: { error: "MATRICULA_DUPLICADA" } }), eventos: async () => [] } });
    const res = await request(app(d)).post("/api/matriculas").set(auth()).send({ alunoId: "a1", turmaId: "t1", planoId: "p1" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("MATRICULA_DUPLICADA");
  });

  it("GET /api/cobrancas traz nome do aluno/plano e totais", async () => {
    const res = await request(app()).get("/api/cobrancas").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.itens[0].alunoNome).toBe("Maria");
    expect(res.body.totais.pendente).toBe(99.9);
  });

  it("GET /api/eventos agrupa por correlationId e monta a trilha do fluxo entre serviços", async () => {
    const ev = (servico: string, name: string, direcao: "PUBLICACAO" | "CONSUMO", status: string, em: string, extra: any = {}) =>
      ({ eventId: servico + name + direcao, correlationId: "corr-1", name, tenantId: "academia-a", servico, direcao, status, tentativas: 1, erro: null, em, ...extra });
    const d = fakes({
      matriculas: { ...fakes().matriculas, eventos: async () => [ev("matriculas", "MatriculaCriada", "PUBLICACAO", "PUBLICADO", "2026-10-11T10:00:00Z")] },
      financeiro: { ...fakes().financeiro, eventos: async () => [
        ev("financeiro", "MatriculaCriada", "CONSUMO", "PROCESSADO", "2026-10-11T10:00:01Z"),
        ev("financeiro", "CobrancaGerada", "PUBLICACAO", "PUBLICADO", "2026-10-11T10:00:02Z") ] },
      notificacoes: { ...fakes().notificacoes, eventos: async () => [
        ev("notificacoes", "CobrancaGerada", "CONSUMO", "FALHA", "2026-10-11T10:00:03Z", { tentativas: 2, erro: "smtp fora" }) ] },
    });
    const res = await request(app(d)).get("/api/eventos").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.fluxos).toHaveLength(1);
    expect(res.body.fluxos[0].etapas.map((e: any) => e.servico + ":" + e.direcao)).toEqual(
      ["matriculas:PUBLICACAO", "financeiro:CONSUMO", "financeiro:PUBLICACAO", "notificacoes:CONSUMO"]);
    expect(res.body.fluxos[0].status).toBe("COM_FALHA");
    expect(res.body.resumo.comFalha).toBe(1);
  });

  it("GET /api/eventos degrada quando um serviço de origem está fora do ar", async () => {
    const d = fakes({ financeiro: { ...fakes().financeiro, eventos: async () => { throw new UpstreamError("financeiro", "timeout"); } } });
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const res = await request(app(d)).get("/api/eventos").set(auth());
    spy.mockRestore();
    expect(res.status).toBe(200);
    expect(res.body.degradado).toEqual(["financeiro"]);
  });
});
