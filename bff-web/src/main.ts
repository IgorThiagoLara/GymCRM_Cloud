import express, { Express } from "express";
import { authRoutes } from "./auth/authRoutes";
import { sessionMiddleware } from "./auth/sessionMiddleware";
import { httpDownstream } from "./clients/HttpDownstream";
import { apiRoutes } from "./routes/apiRoutes";
import { Downstream } from "./types";

export interface AppOptions { jwtSecret: string; downstream: Downstream }

export function buildApp(o: AppOptions): Express {
  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => { res.json({ status: "ok", service: "bff-web" }); });
  app.use(authRoutes(o.jwtSecret));
  app.use("/api", sessionMiddleware(o.jwtSecret));
  app.use(apiRoutes(o.downstream));
  return app;
}

if (require.main === module) {
  const env = process.env;
  const downstream = httpDownstream({
    cadastros: env.CADASTROS_URL ?? "http://localhost:3001",
    matriculas: env.MATRICULAS_URL ?? "http://localhost:3002",
    financeiro: env.FINANCEIRO_URL ?? "http://localhost:3003",
    notificacoes: env.NOTIFICACOES_URL ?? "http://localhost:3004",
  });
  const port = Number(env.PORT ?? 4000);
  buildApp({ jwtSecret: env.JWT_SECRET ?? "dev-secret-troque-em-producao", downstream })
    .listen(port, () => console.log(`bff-web na porta ${port}`));
}
