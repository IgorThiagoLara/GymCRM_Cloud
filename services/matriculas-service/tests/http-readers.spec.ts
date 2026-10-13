import http from "http";
import { AddressInfo } from "net";
import jwt from "jsonwebtoken";
import { HttpAlunoReader } from "../src/features/matriculas/criar-matricula/infrastructure/HttpCadastrosReaders";
import { UpstreamUnavailableError } from "../src/shared/http/UpstreamError";
import { TenantContext } from "../src/shared/kernel/TenantContext";

const ctx: TenantContext = { tenantId: "academia-a", userId: "u1", perfil: "RECEPCIONISTA" };
const SECRET = "s";

function servidor(handler: http.RequestListener): Promise<{ url: string; close: () => void }> {
  return new Promise((resolve) => {
    const srv = http.createServer(handler).listen(0, () =>
      resolve({ url: `http://127.0.0.1:${(srv.address() as AddressInfo).port}`, close: () => srv.close() }));
  });
}

describe("HttpAlunoReader (adapter para o cadastros-service)", () => {
  it("propaga identidade/tenant no JWT e devolve o aluno", async () => {
    let authHeader = "";
    const srv = await servidor((req, res) => {
      authHeader = req.headers.authorization ?? "";
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ id: "a1", nome: "Ana", email: "ana@x.com" }));
    });
    const aluno = await new HttpAlunoReader({ baseUrl: srv.url, jwtSecret: SECRET }).obter("a1", ctx);
    srv.close();
    expect(aluno?.nome).toBe("Ana");
    const claims = jwt.verify(authHeader.replace("Bearer ", ""), SECRET) as any;
    expect(claims.tenantId).toBe("academia-a");
    expect(claims.perfil).toBe("RECEPCIONISTA");
  });

  it("404 => null (aluno inexistente é regra de negócio, não falha técnica)", async () => {
    const srv = await servidor((_req, res) => { res.statusCode = 404; res.end("{}"); });
    expect(await new HttpAlunoReader({ baseUrl: srv.url, jwtSecret: SECRET }).obter("x", ctx)).toBeNull();
    srv.close();
  });

  it("5xx ou conexão recusada => UpstreamUnavailableError", async () => {
    const srv = await servidor((_req, res) => { res.statusCode = 500; res.end(); });
    const reader = new HttpAlunoReader({ baseUrl: srv.url, jwtSecret: SECRET });
    await expect(reader.obter("x", ctx)).rejects.toBeInstanceOf(UpstreamUnavailableError);
    srv.close();
    await expect(new HttpAlunoReader({ baseUrl: "http://127.0.0.1:1", jwtSecret: SECRET, timeoutMs: 500 }).obter("x", ctx))
      .rejects.toBeInstanceOf(UpstreamUnavailableError);
  });
});
