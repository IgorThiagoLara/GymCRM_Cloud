import { randomUUID } from "crypto";
import http, { IncomingMessage, Server, ServerResponse } from "http";
import { GatewayConfig, RouteRule } from "./config";
import { verifyHs256 } from "./jwt";
import { forward } from "./proxy";
import { RateLimiter } from "./rateLimit";

const SEGURANCA: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};

function json(res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}): void {
  res.writeHead(status, { "Content-Type": "application/json", ...extra });
  res.end(JSON.stringify(body));
}

export function createGateway(cfg: GatewayConfig): Server {
  const rotas = [...cfg.routes].sort((a, b) => b.prefix.length - a.prefix.length);
  const limitadores = new Map<string, RateLimiter>();
  for (const r of rotas) if (r.rateLimit) limitadores.set(r.name, new RateLimiter(r.rateLimit.max, r.rateLimit.windowMs));
  const log = cfg.logger ?? ((l) => console.log(JSON.stringify(l)));

  const casar = (path: string): RouteRule | undefined =>
    rotas.find((r) => path.startsWith(r.prefix) || path === r.prefix.slice(0, -1));

  return http.createServer((req: IncomingMessage, res: ServerResponse) => {
    const inicio = Date.now();
    const recebido = req.headers["x-request-id"];
    const requestId = typeof recebido === "string" && /^[\w-]{8,100}$/.test(recebido) ? recebido : randomUUID();
    const url = new URL(req.url ?? "/", "http://gateway");
    const path = url.pathname;
    const ip = req.socket.remoteAddress ?? "";
    let rotaNome = "-";
    let usuario: string | undefined;

    res.setHeader("x-request-id", requestId);
    for (const [k, v] of Object.entries(SEGURANCA)) res.setHeader(k, v);
    res.on("finish", () =>
      log({ ts: new Date().toISOString(), requestId, method: req.method, path, status: res.statusCode, ms: Date.now() - inicio, rota: rotaNome, usuario, ip })
    );

    const origem = req.headers.origin;
    if (origem && cfg.corsOrigins.includes(origem)) {
      res.setHeader("Access-Control-Allow-Origin", origem);
      res.setHeader("Vary", "Origin");
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Authorization,Content-Type,X-Request-Id",
          "Access-Control-Max-Age": "600",
        });
        res.end();
        return;
      }
    }

    if (path === "/__gateway/health") {
      json(res, 200, { status: "ok", service: "api-gateway", rotas: rotas.map((r) => r.name) });
      return;
    }

    const rota = casar(path);
    if (!rota) { json(res, 404, { error: "ROTA_NAO_ENCONTRADA", requestId }); return; }
    rotaNome = rota.name;

    const tamanho = Number(req.headers["content-length"] ?? 0);
    if (tamanho > cfg.maxBodyBytes) { json(res, 413, { error: "CORPO_MUITO_GRANDE", requestId }); return; }

    let identidade: Record<string, string> | undefined;
    if (rota.auth) {
      const h = req.headers.authorization;
      if (!h || !h.startsWith("Bearer ")) { json(res, 401, { error: "NAO_AUTENTICADO", requestId }); return; }
      const claims = verifyHs256(h.slice(7), cfg.jwtSecret);
      if (!claims) { json(res, 401, { error: "TOKEN_INVALIDO", requestId }); return; }
      usuario = claims.sub;
      identidade = { "x-user-id": claims.sub, "x-tenant-id": claims.tenantId, "x-user-perfil": claims.perfil };
    }

    const limitador = limitadores.get(rota.name);
    if (limitador) {
      const d = limitador.hit(usuario ? `${usuario}|${ip}` : ip);
      res.setHeader("X-RateLimit-Limit", String(d.limit));
      res.setHeader("X-RateLimit-Remaining", String(d.remaining));
      if (!d.allowed) {
        json(res, 429, { error: "MUITAS_REQUISICOES", requestId }, { "Retry-After": String(d.retryAfterSec) });
        return;
      }
    }

    const caminho = rota.stripPrefix ? "/" + path.slice(rota.prefix.length) : path;
    forward(req, res, {
      target: rota.target, path: caminho + url.search, timeoutMs: cfg.upstreamTimeoutMs,
      requestId, identity: identidade, rotaNome: rota.name,
    });
  });
}
