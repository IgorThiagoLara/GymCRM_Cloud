import express, { Express } from "express";
import { Pool } from "pg";
import { migrate } from "./db/schema";
import { CriarMatriculaUseCase } from "./features/matriculas/criar-matricula/application/CriarMatriculaUseCase";
import { IAlunoReader, IMatriculaRepository, IPlanoReader } from "./features/matriculas/criar-matricula/application/ports";
import { HttpAlunoReader, HttpPlanoReader } from "./features/matriculas/criar-matricula/infrastructure/HttpCadastrosReaders";
import { InMemoryMatriculaRepository } from "./features/matriculas/criar-matricula/infrastructure/InMemoryMatriculaRepository";
import { InMemoryAlunoReader, InMemoryPlanoReader } from "./features/matriculas/criar-matricula/infrastructure/InMemoryReaders";
import { PostgresMatriculaRepository } from "./features/matriculas/criar-matricula/infrastructure/PostgresMatriculaRepository";
import { CriarMatriculaController } from "./features/matriculas/criar-matricula/presentation/CriarMatriculaController";
import { criarMatriculaRoutes } from "./features/matriculas/criar-matricula/presentation/criarMatricula.routes";
import { ListarMatriculasUseCase } from "./features/matriculas/listar-matriculas/application/ListarMatriculasUseCase";
import { IMatriculaQuery } from "./features/matriculas/listar-matriculas/application/ports";
import { InMemoryMatriculaQuery } from "./features/matriculas/listar-matriculas/infrastructure/InMemoryMatriculaQuery";
import { PostgresMatriculaQuery } from "./features/matriculas/listar-matriculas/infrastructure/PostgresMatriculaQuery";
import { ListarMatriculasController } from "./features/matriculas/listar-matriculas/presentation/ListarMatriculasController";
import { listarMatriculasRoutes } from "./features/matriculas/listar-matriculas/presentation/listarMatriculas.routes";
import { IEventLogQuery } from "./shared/events/IEventLog";
import { IEventPublisher } from "./shared/events/IEventPublisher";
import { InMemoryEventBus } from "./shared/events/InMemoryEventBus";
import { authMiddleware } from "./shared/http/AuthMiddleware";
import { errorHandler } from "./shared/http/ErrorMiddleware";
import { eventLogRoutes } from "./shared/http/EventLogRoutes";
import { IUnitOfWork, NoopUnitOfWork } from "./shared/kernel/IUnitOfWork";
import { OutboxEventPublisher } from "./shared/messaging/OutboxEventPublisher";
import { OutboxRelay } from "./shared/messaging/OutboxRelay";
import { RabbitMqEventBus } from "./shared/messaging/RabbitMqEventBus";
import { InMemoryEventLogQuery, InMemoryOutboxStore } from "./shared/persistence/InMemoryEventStores";
import { InMemoryStore } from "./shared/persistence/InMemoryStore";
import { PgEventLogQuery } from "./shared/persistence/PgEventLogQuery";
import { PgOutboxStore } from "./shared/persistence/PgOutboxStore";
import { PgUnitOfWork } from "./shared/persistence/PgUnitOfWork";

export interface AppOptions {
  jwtSecret: string;
  events?: IEventPublisher;
  uow?: IUnitOfWork;
  eventLog?: IEventLogQuery;
  matriculas?: IMatriculaRepository;
  matriculaQuery?: IMatriculaQuery;
  alunoReader?: IAlunoReader;
  planoReader?: IPlanoReader;
}

export function buildApp(options: AppOptions): Express {
  const store = new InMemoryStore<any>();
  const matriculas = options.matriculas ?? new InMemoryMatriculaRepository(store);
  const query = options.matriculaQuery ?? new InMemoryMatriculaQuery(store);
  const alunoReader = options.alunoReader ?? new InMemoryAlunoReader([
    { tenantId: "academia-a", id: "aluno-1", nome: "Maria Silva", email: "maria@exemplo.com" },
    { tenantId: "academia-b", id: "aluno-2", nome: "João Pereira", email: "joao@exemplo.com" },
  ]);
  const planoReader = options.planoReader ?? new InMemoryPlanoReader([
    { tenantId: "academia-a", id: "plano-mensal", nome: "Mensal", valor: 99.9, duracaoMeses: 1 },
    { tenantId: "academia-b", id: "plano-anual", nome: "Anual", valor: 899, duracaoMeses: 12 },
  ]);
  const events = options.events ?? new InMemoryEventBus();

  const criarMatricula = new CriarMatriculaUseCase(matriculas, alunoReader, planoReader, events, options.uow ?? new NoopUnitOfWork());
  const criarController = new CriarMatriculaController(criarMatricula);
  const listarController = new ListarMatriculasController(new ListarMatriculasUseCase(query));

  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => { res.json({ status: "ok", service: "matriculas" }); });
  app.use(authMiddleware(options.jwtSecret));
  app.use(criarMatriculaRoutes(criarController));
  app.use(listarMatriculasRoutes(listarController));
  app.use(eventLogRoutes(options.eventLog ?? new InMemoryEventLogQuery(), "matriculas"));
  app.use(errorHandler);
  return app;
}

async function bootstrap(): Promise<void> {
  const jwtSecret = process.env.JWT_SECRET ?? "dev-secret-troque-em-producao";
  const options: AppOptions = { jwtSecret };

  let outbox = new InMemoryOutboxStore() as InMemoryOutboxStore | PgOutboxStore;
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await migrate(pool);
    const uow = new PgUnitOfWork(pool);
    options.uow = uow;
    options.matriculas = new PostgresMatriculaRepository(uow.executor);
    options.matriculaQuery = new PostgresMatriculaQuery(pool);
    outbox = new PgOutboxStore(uow.executor);
    options.eventLog = new PgEventLogQuery(pool);
    console.log("[matriculas] usando PostgreSQL (database per service) + outbox transacional");
  } else {
    options.eventLog = new InMemoryEventLogQuery(outbox as InMemoryOutboxStore);
  }
  options.events = new OutboxEventPublisher(outbox, "matriculas-service");

  if (process.env.CADASTROS_URL) {
    options.alunoReader = new HttpAlunoReader({ baseUrl: process.env.CADASTROS_URL, jwtSecret });
    options.planoReader = new HttpPlanoReader({ baseUrl: process.env.CADASTROS_URL, jwtSecret });
    console.log(`[matriculas] consultando cadastros em ${process.env.CADASTROS_URL}`);
  }

  let broker: IEventPublisher = new InMemoryEventBus();
  if (process.env.AMQP_URL) {
    const rabbit = new RabbitMqEventBus({ url: process.env.AMQP_URL, serviceName: "matriculas-service" });
    await rabbit.start();
    broker = rabbit;
    console.log("[matriculas] relay publicando no RabbitMQ");
  }
  new OutboxRelay(outbox, broker, "matriculas-service").start();

  const port = Number(process.env.PORT ?? 3002);
  buildApp(options).listen(port, () => console.log(`matriculas-service na porta ${port}`));
}

if (require.main === module) {
  bootstrap().catch((e) => { console.error(e); process.exit(1); });
}
