export interface RouteRule {
  name: string;
  prefix: string;
  target: string;
  stripPrefix?: boolean;
  auth: boolean;
  rateLimit?: { max: number; windowMs: number };
}

export interface GatewayConfig {
  jwtSecret: string;
  routes: RouteRule[];
  upstreamTimeoutMs: number;
  maxBodyBytes: number;
  corsOrigins: string[];
  logger?: (line: Record<string, unknown>) => void;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  const minuto = 60_000;
  const url = (k: string, padrao: string) => (env[k] && env[k]!.length > 0 ? env[k]! : padrao).replace(/\/$/, "");
  const num = (k: string, padrao: number) => (Number.isFinite(Number(env[k])) && env[k] ? Number(env[k]) : padrao);
  const bff = url("BFF_URL", "http://localhost:4000");

  return {
    jwtSecret: env.JWT_SECRET ?? "dev-secret-troque-em-producao",
    upstreamTimeoutMs: num("UPSTREAM_TIMEOUT_MS", 10_000),
    maxBodyBytes: num("MAX_BODY_BYTES", 1_048_576),
    corsOrigins: (env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    routes: [
      { name: "bff-api", prefix: "/api/", target: bff, auth: true, rateLimit: { max: num("RATE_LIMIT_API", 300), windowMs: minuto } },
      { name: "bff-auth", prefix: "/auth/", target: bff, auth: false, rateLimit: { max: num("RATE_LIMIT_LOGIN", 20), windowMs: minuto } },
      { name: "mfe-matriculas", prefix: "/mfe/matriculas/", target: url("MFE_MATRICULAS_URL", "http://localhost:5171"), stripPrefix: true, auth: false },
      { name: "mfe-financeiro", prefix: "/mfe/financeiro/", target: url("MFE_FINANCEIRO_URL", "http://localhost:5172"), stripPrefix: true, auth: false },
      { name: "mfe-eventos", prefix: "/mfe/eventos/", target: url("MFE_EVENTOS_URL", "http://localhost:5173"), stripPrefix: true, auth: false },
      { name: "shell", prefix: "/", target: url("SHELL_URL", "http://localhost:5170"), auth: false },
    ],
  };
}
