import { createHmac } from "crypto";
import http, { IncomingMessage, Server } from "http";
import { AddressInfo } from "net";
import { GatewayConfig } from "../src/config";
import { createGateway } from "../src/gateway";

const SECRET = "segredo-de-teste";
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
function jwtHs256(claims: Record<string, unknown>, secret = SECRET, alg = "HS256"): string {
  const h = b64({ alg, typ: "JWT" }), p = b64(claims);
  return `${h}.${p}.${createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
}
const valido = () => jwtHs256({ sub: "u1", tenantId: "academia-a", perfil: "ADMIN", exp: Math.floor(Date.now() / 1000) + 600 });

interface Visto { url?: string; method?: string; headers: IncomingMessage["headers"]; body: string }
function sobe(srv: Server): Promise<string> {
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r(`http://127.0.0.1:${(srv.address() as AddressInfo).port}`)));
}
function upstream(nome: string, atraso = 0) {
  const vistos: Visto[] = [];
  const srv = http.createServer((req, res) => {
    let body = ""; req.on("data", (c) => (body += c));
    req.on("end", () => {
      vistos.push({ url: req.url, method: req.method, headers: req.headers, body });
      setTimeout(() => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ upstream: nome, url: req.url })); }, atraso);
    });
  });
  return { srv, vistos };
}

describe("API Gateway", () => {
  const bff = upstream("bff"), shell = upstream("shell"), mfe = upstream("mfe-matriculas"), lento = upstream("lento", 400);
  const abertos: Server[] = [];
  let base = "";
  let logs: Record<string, unknown>[] = [];
  let urls: Record<string, string> = {};

  async function gateway(over: Partial<GatewayConfig> = {}): Promise<string> {
    const cfg: GatewayConfig = {
      jwtSecret: SECRET, upstreamTimeoutMs: 200, maxBodyBytes: 1000, corsOrigins: ["http://app.exemplo.com"],
      logger: (l) => logs.push(l),
      routes: [
        { name: "bff-api", prefix: "/api/", target: urls.bff, auth: true, rateLimit: { max: 3, windowMs: 60_000 } },
        { name: "bff-auth", prefix: "/auth/", target: urls.bff, auth: false, rateLimit: { max: 2, windowMs: 60_000 } },
        { name: "lento", prefix: "/lento/", target: urls.lento, auth: false },
        { name: "morto", prefix: "/morto/", target: "http://127.0.0.1:1", auth: false },
        { name: "mfe-matriculas", prefix: "/mfe/matriculas/", target: urls.mfe, stripPrefix: true, auth: false },
        { name: "shell", prefix: "/", target: urls.shell, auth: false },
      ],
      ...over,
    };
    const srv = createGateway(cfg); abertos.push(srv);
    return sobe(srv);
  }

  beforeAll(async () => {
    for (const [k, u] of Object.entries({ bff, shell, mfe, lento })) { abertos.push(u.srv); urls[k] = await sobe(u.srv); }
  });
  beforeEach(async () => { logs = []; bff.vistos.length = 0; shell.vistos.length = 0; mfe.vistos.length = 0; base = await gateway(); });
  afterAll(() => { for (const s of abertos) s.close(); });

  it("rota pública para o shell; devolve x-request-id e cabeçalhos de segurança", async () => {
    const r = await fetch(`${base}/qualquer/coisa`);
    expect(r.status).toBe(200);
    expect((await r.json()).upstream).toBe("shell");
    expect((r.headers.get("x-request-id") ?? "").length > 8).toBe(true);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("x-frame-options")).toBe("DENY");
  });

  it("stripPrefix: /mfe/matriculas/assets/a.js chega ao microfrontend como /assets/a.js (com query)", async () => {
    const r = await fetch(`${base}/mfe/matriculas/assets/a.js?v=1`);
    expect((await r.json()).upstream).toBe("mfe-matriculas");
    expect(mfe.vistos[0].url).toBe("/assets/a.js?v=1");
  });

  it("/api sem token => 401; token com assinatura errada, alg=none ou expirado => 401 (nada chega ao BFF)", async () => {
    expect((await fetch(`${base}/api/matriculas`)).status).toBe(401);
    const ruins = [
      jwtHs256({ sub: "u", tenantId: "t", perfil: "ADMIN" }, "outro-segredo"),
      jwtHs256({ sub: "u", tenantId: "t", perfil: "ADMIN" }, SECRET, "none"),
      jwtHs256({ sub: "u", tenantId: "t", perfil: "ADMIN", exp: 1 }),
      jwtHs256({ sub: "u" }),
    ];
    for (const t of ruins) expect((await fetch(`${base}/api/matriculas`, { headers: { Authorization: `Bearer ${t}` } })).status).toBe(401);
    expect(bff.vistos).toHaveLength(0);
  });

  it("token válido: repassa ao BFF com identidade; cabeçalhos x-user-* forjados pelo cliente são descartados", async () => {
    const r = await fetch(`${base}/api/matriculas`, {
      headers: { Authorization: `Bearer ${valido()}`, "x-tenant-id": "academia-FORJADA", "x-request-id": "meu-request-id-123" },
    });
    expect(r.status).toBe(200);
    expect(r.headers.get("x-request-id")).toBe("meu-request-id-123");
    const visto = bff.vistos[0];
    expect(visto.headers["x-tenant-id"]).toBe("academia-a");
    expect(visto.headers["x-user-id"]).toBe("u1");
    expect(visto.headers["x-request-id"]).toBe("meu-request-id-123");
    expect(String(visto.headers.authorization).startsWith("Bearer ")).toBe(true);
  });

  it("encaminha método e corpo (POST /auth/login) sem exigir token", async () => {
    const r = await fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "a@b.com" }) });
    expect(r.status).toBe(200);
    expect(bff.vistos[0].method).toBe("POST");
    expect(JSON.parse(bff.vistos[0].body).email).toBe("a@b.com");
  });

  it("rate limit: excedido => 429 com Retry-After", async () => {
    await fetch(`${base}/auth/login`, { method: "POST" });
    await fetch(`${base}/auth/login`, { method: "POST" });
    const r = await fetch(`${base}/auth/login`, { method: "POST" });
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("retry-after")) >= 1).toBe(true);
    expect(bff.vistos).toHaveLength(2);
  });

  it("upstream fora do ar => 502; upstream lento => 504", async () => {
    const morto = await fetch(`${base}/morto/x`);
    expect(morto.status).toBe(502);
    expect((await morto.json()).error).toBe("UPSTREAM_INDISPONIVEL");
    const lentoR = await fetch(`${base}/lento/x`);
    expect(lentoR.status).toBe(504);
    expect((await lentoR.json()).error).toBe("UPSTREAM_TIMEOUT");
  });

  it("corpo acima do limite => 413", async () => {
    const r = await fetch(`${base}/auth/login`, { method: "POST", body: "x".repeat(2000) });
    expect(r.status).toBe(413);
  });

  it("CORS: preflight de origem permitida => 204; origem desconhecida não recebe cabeçalho", async () => {
    const ok = await fetch(`${base}/api/x`, { method: "OPTIONS", headers: { Origin: "http://app.exemplo.com" } });
    expect(ok.status).toBe(204);
    expect(ok.headers.get("access-control-allow-origin")).toBe("http://app.exemplo.com");
    const ruim = await fetch(`${base}/qualquer`, { headers: { Origin: "http://malicioso.com" } });
    expect(ruim.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("health do gateway e access log estruturado (com rota e usuário)", async () => {
    const h = await fetch(`${base}/__gateway/health`);
    expect((await h.json()).status).toBe("ok");
    await fetch(`${base}/api/x`, { headers: { Authorization: `Bearer ${valido()}` } });
    await new Promise((r) => setTimeout(r, 30));
    const linha = logs.find((l) => l.rota === "bff-api");
    expect(linha?.usuario).toBe("u1");
    expect(linha?.status).toBe(200);
    expect(typeof linha?.requestId).toBe("string");
  });
});
