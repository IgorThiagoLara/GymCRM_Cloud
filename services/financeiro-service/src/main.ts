import express, { Express } from "express";
import { Pool } from "pg";
import { migrate } from "./db/schema";
import { ConsultarCobrancasUseCase } from "./features/financeiro/consultar-cobrancas/application/ConsultarCobrancasUseCase";
import { ICobrancaQuery } from "./features/financeiro/consultar-cobrancas/application/ports";
import { InMemoryCobrancaQuery } from "./features/financeiro/consultar-cobrancas/infrastructure/InMemoryCobrancaQuery";
import { PostgresCobrancaQuery } from "./features/financeiro/consultar-cobrancas/infrastructure/PostgresCobrancaQuery";
import { ConsultarCobrancasController } from "./features/financeiro/consultar-cobrancas/presentation/ConsultarCobrancasController";
import { consultarCobrancasRoutes } from "./features/financeiro/consultar-cobrancas/presentation/consultarCobrancas.routes";
import { GerarCobrancaUseCase } from "./features/financeiro/gerar-cobranca/application/GerarCobrancaUseCase";
import { ICobrancaRepository } from "./features/financeiro/gerar-cobranca/application/ICobrancaRepository";
import { MatriculaCriadaHandler } from "./features/financeiro/gerar-cobranca/application/MatriculaCriadaHandler";
import { InMemoryCobrancaRepository } from "./features/financeiro/gerar-cobranca/infrastructure/InMemoryCobrancaRepository";
import { PostgresCobrancaRepository } from "./features/financeiro/gerar-cobranca/infrastructure/PostgresCobrancaRepository";
import { IConsumoStore } from "./shared/events/IConsumoStore";
import { IEventLogQuery } from "./shared/events/IEventLog";
import { IEventPublisher } from "./shared/events/IEventPublisher";
import { IEventSubscriber } from "./shared/events/IEventSubscriber";
import { IdempotentHandler } from "./shared/events/IdempotentHandler";
import { InMemoryEventBus } from "./shared/events/InMemoryEventBus";
import { authMiddleware } from "./shared/http/AuthMiddleware";
import { errorHandler } from "./shared/http/ErrorMiddleware";
import { eventLogRoutes } from "./shared/http/EventLogRoutes";
import { IUnitOfWork, NoopUnitOfWork } from "./shared/kernel/IUnitOfWork";
import { OutboxEventPublisher } from "./shared/messaging/OutboxEventPublisher";
import { OutboxRelay } from "./shared/messaging/OutboxRelay";
import { RabbitMqEventBus } from "./shared/messaging/RabbitMqEventBus";
import { InMemoryConsumoStore, InMemoryEventLogQuery, InMemoryOutboxStore } from "./shared/persistence/InMemoryEventStores";
import { InMemoryStore } from "./shared/persistence/InMemoryStore";
import { PgConsumoStore } from "./shared/persistence/PgConsumoStore";
import { PgEventLogQuery } from "./shared/persistence/PgEventLogQuery";
import { PgOutboxStore } from "./shared/persistence/PgOutboxStore";
import { PgUnitOfWork } from "./shared/persistence/PgUnitOfWork";

export const CONSUMER = "financeiro-service";

export interface AppOptions {
  jwtSecret: string;
  bus?: IEventPublisher & IEventSubscriber;
  publisher?: IEventPublisher;
  uow?: IUnitOfWork;
  consumo?: IConsumoStore;
  eventLog?: IEventLogQuery;
  cobrancas?: ICobrancaRepository;
  cobrancaQuery?: ICobrancaQuery;
}

export function buildApp(options: AppOptions): Express {
  const bus = options.bus ?? new InMemoryEventBus();
  const store = new InMemoryStore<any>();
  const cobrancas = options.cobrancas ?? new InMemoryCobrancaRepository(store);
  const query = options.cobrancaQuery ?? new InMemoryCobrancaQuery(store);
  const consumo = options.consumo ?? new InMemoryConsumoStore();

  const gerarCobranca = new GerarCobrancaUseCase(cobrancas, options.publisher ?? bus);
  bus.subscribe(
    "MatriculaCriada",
    new IdempotentHandler(new MatriculaCriadaHandler(gerarCobranca), consumo, CONSUMER, options.uow ?? new NoopUnitOfWork())
  );

  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => { res.json({ status: "ok", service: "financeiro" }); });
  app.use(authMiddleware(options.jwtSecret));
  app.use(consultarCobrancasRoutes(new ConsultarCobrancasController(new ConsultarCobrancasUseCase(query))));
  app.use(eventLogRoutes(options.eventLog ?? new InMemoryEventLogQuery(undefined, consumo as InMemoryConsumoStore), "financeiro"));
  app.use(errorHandler);
  return app;
}

async function bootstrap(): Promise<void> {
  const options: AppOptions = { jwtSecret: process.env.JWT_SECRET ?? "dev-secret-troque-em-producao" };

  let outbox: InMemoryOutboxStore | PgOutboxStore = new InMemoryOutboxStore();
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await migrate(pool);
    const uow = new PgUnitOfWork(pool);
    options.uow = uow;
    options.cobrancas = new PostgresCobrancaRepository(uow.executor);
    options.cobrancaQuery = new PostgresCobrancaQuery(pool);
    outbox = new PgOutboxStore(uow.executor);
    options.consumo = new PgConsumoStore(uow.executor);
    options.eventLog = new PgEventLogQuery(pool);
    console.log("[financeiro] usando PostgreSQL (database per service) + outbox + consumo idempotente");
  } else {
    const consumo = new InMemoryConsumoStore();
    options.consumo = consumo;
    options.eventLog = new InMemoryEventLogQuery(outbox as InMemoryOutboxStore, consumo);
  }
  options.publisher = new OutboxEventPublisher(outbox, CONSUMER);

  let broker: IEventPublisher = new InMemoryEventBus();
  let rabbit: RabbitMqEventBus | undefined;
  if (process.env.AMQP_URL) {
    rabbit = new RabbitMqEventBus({ url: process.env.AMQP_URL, serviceName: CONSUMER });
    options.bus = rabbit;
    broker = rabbit;
  }
  const app = buildApp(options); 
  if (rabbit) { await rabbit.start(); console.log("[financeiro] consumindo MatriculaCriada (retry com backoff + DLQ)"); }
  new OutboxRelay(outbox, broker, CONSUMER).start();

  const port = Number(process.env.PORT ?? 3003);
  app.listen(port, () => console.log(`financeiro-service na porta ${port}`));
}

if (require.main === module) {
  bootstrap().catch((e) => { console.error(e); process.exit(1); });
}
