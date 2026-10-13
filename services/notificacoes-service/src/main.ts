import express, { Express } from "express";
import { Pool } from "pg";
import { migrate } from "./db/schema";
import { ConsultarNotificacoesUseCase } from "./features/notificacoes/consultar-notificacoes/application/ConsultarNotificacoesUseCase";
import { INotificacaoQuery } from "./features/notificacoes/consultar-notificacoes/application/ports";
import { InMemoryNotificacaoQuery } from "./features/notificacoes/consultar-notificacoes/infrastructure/InMemoryNotificacaoQuery";
import { PostgresNotificacaoQuery } from "./features/notificacoes/consultar-notificacoes/infrastructure/PostgresNotificacaoQuery";
import { ConsultarNotificacoesController } from "./features/notificacoes/consultar-notificacoes/presentation/ConsultarNotificacoesController";
import { consultarNotificacoesRoutes } from "./features/notificacoes/consultar-notificacoes/presentation/consultarNotificacoes.routes";
import { CobrancaGeradaHandler } from "./features/notificacoes/enviar-email/application/CobrancaGeradaHandler";
import { EnviarNotificacaoUseCase } from "./features/notificacoes/enviar-email/application/EnviarNotificacaoUseCase";
import { INotificacaoRepository } from "./features/notificacoes/enviar-email/application/INotificacaoRepository";
import { INotificationSender } from "./features/notificacoes/enviar-email/application/INotificationSender";
import { AzureFunctionEmailSender } from "./features/notificacoes/enviar-email/infrastructure/AzureFunctionEmailSender";
import { ConsoleEmailSender } from "./features/notificacoes/enviar-email/infrastructure/ConsoleEmailSender";
import { FalhaSimuladaEmailSender } from "./features/notificacoes/enviar-email/infrastructure/FalhaSimuladaEmailSender";
import { InMemoryNotificacaoRepository } from "./features/notificacoes/enviar-email/infrastructure/InMemoryNotificacaoRepository";
import { PostgresNotificacaoRepository } from "./features/notificacoes/enviar-email/infrastructure/PostgresNotificacaoRepository";
import { IConsumoStore } from "./shared/events/IConsumoStore";
import { IEventLogQuery } from "./shared/events/IEventLog";
import { IEventSubscriber } from "./shared/events/IEventSubscriber";
import { IdempotentHandler } from "./shared/events/IdempotentHandler";
import { InMemoryEventBus } from "./shared/events/InMemoryEventBus";
import { authMiddleware } from "./shared/http/AuthMiddleware";
import { errorHandler } from "./shared/http/ErrorMiddleware";
import { eventLogRoutes } from "./shared/http/EventLogRoutes";
import { RabbitMqEventBus } from "./shared/messaging/RabbitMqEventBus";
import { InMemoryConsumoStore, InMemoryEventLogQuery } from "./shared/persistence/InMemoryEventStores";
import { InMemoryStore } from "./shared/persistence/InMemoryStore";
import { PgConsumoStore } from "./shared/persistence/PgConsumoStore";
import { PgEventLogQuery } from "./shared/persistence/PgEventLogQuery";

export const CONSUMER = "notificacoes-service";

export interface AppOptions {
  jwtSecret: string;
  bus?: IEventSubscriber;
  emailSender?: INotificationSender;
  historico?: INotificacaoRepository;
  notificacaoQuery?: INotificacaoQuery;
  consumo?: IConsumoStore;
  eventLog?: IEventLogQuery;
}

export function buildApp(options: AppOptions): Express {
  const bus = options.bus ?? new InMemoryEventBus();
  const store = new InMemoryStore<any>();
  const historico = options.historico ?? new InMemoryNotificacaoRepository(store);
  const query = options.notificacaoQuery ?? new InMemoryNotificacaoQuery(store);
  const consumo = options.consumo ?? new InMemoryConsumoStore();

  const enviar = new EnviarNotificacaoUseCase(options.emailSender ?? new ConsoleEmailSender(), historico);
  bus.subscribe("CobrancaGerada", new IdempotentHandler(new CobrancaGeradaHandler(enviar), consumo, CONSUMER));

  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => { res.json({ status: "ok", service: "notificacoes" }); });
  app.use(authMiddleware(options.jwtSecret));
  app.use(consultarNotificacoesRoutes(new ConsultarNotificacoesController(new ConsultarNotificacoesUseCase(query))));
  app.use(eventLogRoutes(options.eventLog ?? new InMemoryEventLogQuery(undefined, consumo as InMemoryConsumoStore), "notificacoes"));
  app.use(errorHandler);
  return app;
}

function escolherEmailSender(): INotificationSender {
  let sender: INotificationSender;
  if (process.env.AZURE_FUNCTION_EMAIL_URL) {
    sender = new AzureFunctionEmailSender({ url: process.env.AZURE_FUNCTION_EMAIL_URL, functionKey: process.env.AZURE_FUNCTION_KEY });
    console.log(`[notificacoes] e-mail via Azure Function: ${process.env.AZURE_FUNCTION_EMAIL_URL}`);
  } else {
    sender = new ConsoleEmailSender();
    console.log("[notificacoes] e-mail via console (defina AZURE_FUNCTION_EMAIL_URL para usar a Azure Function)");
  }
  const falhas = Number(process.env.EMAIL_FALHAS_SIMULADAS ?? 0);
  if (falhas > 0) {
    console.log(`[notificacoes] DEMO: as ${falhas} primeiras tentativas de envio vão falhar (retry com backoff)`);
    sender = new FalhaSimuladaEmailSender(sender, falhas);
  }
  return sender;
}

async function bootstrap(): Promise<void> {
  const options: AppOptions = { jwtSecret: process.env.JWT_SECRET ?? "dev-secret-troque-em-producao", emailSender: escolherEmailSender() };

  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await migrate(pool);
    options.historico = new PostgresNotificacaoRepository(pool);
    options.notificacaoQuery = new PostgresNotificacaoQuery(pool);
    options.consumo = new PgConsumoStore(pool);
    options.eventLog = new PgEventLogQuery(pool);
    console.log("[notificacoes] usando PostgreSQL (database per service) + consumo idempotente");
  }
  let rabbit: RabbitMqEventBus | undefined;
  if (process.env.AMQP_URL) {
    rabbit = new RabbitMqEventBus({ url: process.env.AMQP_URL, serviceName: CONSUMER });
    options.bus = rabbit;
  }
  const app = buildApp(options);
  if (rabbit) { await rabbit.start(); console.log("[notificacoes] consumindo CobrancaGerada (retry com backoff + DLQ)"); }

  const port = Number(process.env.PORT ?? 3004);
  app.listen(port, () => console.log(`notificacoes-service na porta ${port}`));
}

if (require.main === module) {
  bootstrap().catch((e) => { console.error(e); process.exit(1); });
}
