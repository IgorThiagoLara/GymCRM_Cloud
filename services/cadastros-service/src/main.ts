import express, { Express } from "express";
import { Pool } from "pg";
import { migrate, SEED_ALUNOS, SEED_PLANOS } from "./db/schema";
import { ListarAlunosUseCase, ObterAlunoUseCase } from "./features/alunos/consultar-alunos/application/ConsultarAlunosUseCases";
import { IAlunoRepository } from "./features/alunos/consultar-alunos/application/ports";
import { InMemoryAlunoRepository } from "./features/alunos/consultar-alunos/infrastructure/InMemoryAlunoRepository";
import { PostgresAlunoRepository } from "./features/alunos/consultar-alunos/infrastructure/PostgresAlunoRepository";
import { ConsultarAlunosController } from "./features/alunos/consultar-alunos/presentation/ConsultarAlunosController";
import { consultarAlunosRoutes } from "./features/alunos/consultar-alunos/presentation/consultarAlunos.routes";
import { ListarPlanosUseCase, ObterPlanoUseCase } from "./features/planos/consultar-planos/application/ConsultarPlanosUseCases";
import { IPlanoRepository } from "./features/planos/consultar-planos/application/ports";
import { InMemoryPlanoRepository } from "./features/planos/consultar-planos/infrastructure/InMemoryPlanoRepository";
import { PostgresPlanoRepository } from "./features/planos/consultar-planos/infrastructure/PostgresPlanoRepository";
import { ConsultarPlanosController } from "./features/planos/consultar-planos/presentation/ConsultarPlanosController";
import { consultarPlanosRoutes } from "./features/planos/consultar-planos/presentation/consultarPlanos.routes";
import { authMiddleware } from "./shared/http/AuthMiddleware";
import { errorHandler } from "./shared/http/ErrorMiddleware";

export interface AppOptions {
  jwtSecret: string;
  alunos?: IAlunoRepository;
  planos?: IPlanoRepository;
}

export function buildApp(options: AppOptions): Express {
  const alunos = options.alunos ?? new InMemoryAlunoRepository(SEED_ALUNOS);
  const planos = options.planos ?? new InMemoryPlanoRepository(SEED_PLANOS);

  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => { res.json({ status: "ok", service: "cadastros" }); });
  app.use(authMiddleware(options.jwtSecret));
  app.use(consultarAlunosRoutes(new ConsultarAlunosController(new ListarAlunosUseCase(alunos), new ObterAlunoUseCase(alunos))));
  app.use(consultarPlanosRoutes(new ConsultarPlanosController(new ListarPlanosUseCase(planos), new ObterPlanoUseCase(planos))));
  app.use(errorHandler);
  return app;
}

async function bootstrap(): Promise<void> {
  const options: AppOptions = { jwtSecret: process.env.JWT_SECRET ?? "dev-secret-troque-em-producao" };
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await migrate(pool);
    options.alunos = new PostgresAlunoRepository(pool);
    options.planos = new PostgresPlanoRepository(pool);
    console.log("[cadastros] usando PostgreSQL (database per service)");
  } else {
    console.log("[cadastros] DATABASE_URL ausente: usando repositórios em memória");
  }
  const port = Number(process.env.PORT ?? 3001);
  buildApp(options).listen(port, () => console.log(`cadastros-service na porta ${port}`));
}

if (require.main === module) {
  bootstrap().catch((e) => { console.error(e); process.exit(1); });
}
