import http, { IncomingMessage, ServerResponse } from "http";
import https from "https";

const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "host"]);
const IDENTITY_HEADERS = ["x-user-id", "x-tenant-id", "x-user-perfil"];

export interface ForwardOptions {
  target: string;
  path: string;
  timeoutMs: number;
  requestId: string;
  identity?: Record<string, string>;
  rotaNome: string;
}

export function forward(req: IncomingMessage, res: ServerResponse, o: ForwardOptions): void {
  const alvo = new URL(o.path, o.target.endsWith("/") ? o.target : `${o.target}/`);
  const headers: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined || HOP_BY_HOP.has(k) || IDENTITY_HEADERS.includes(k)) continue;
    headers[k] = v as string | string[];
  }
  const ip = req.socket.remoteAddress ?? "";
  headers["x-forwarded-for"] = [req.headers["x-forwarded-for"], ip].filter(Boolean).join(", ");
  headers["x-forwarded-host"] = String(req.headers.host ?? "");
  headers["x-forwarded-proto"] = "http";
  headers["x-request-id"] = o.requestId;
  Object.assign(headers, o.identity ?? {});

  const cliente = alvo.protocol === "https:" ? https : http;
  let estourouTempo = false;

  const upstream = cliente.request(
    { protocol: alvo.protocol, hostname: alvo.hostname, port: alvo.port || undefined, path: alvo.pathname + alvo.search, method: req.method, headers },
    (up) => {
      const respHeaders: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(up.headers)) if (v !== undefined && !HOP_BY_HOP.has(k)) respHeaders[k] = v as string | string[];
      res.writeHead(up.statusCode ?? 502, respHeaders);
      up.pipe(res);
    }
  );

  upstream.setTimeout(o.timeoutMs, () => { estourouTempo = true; upstream.destroy(new Error("timeout")); });
  upstream.on("error", () => {
    if (res.headersSent) { res.destroy(); return; }
    res.statusCode = estourouTempo ? 504 : 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: estourouTempo ? "UPSTREAM_TIMEOUT" : "UPSTREAM_INDISPONIVEL", rota: o.rotaNome, requestId: o.requestId }));
  });
  res.on("close", () => { if (!res.writableEnded) upstream.destroy(); });
  req.pipe(upstream);
}
