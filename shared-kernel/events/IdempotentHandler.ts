import { IUnitOfWork, NoopUnitOfWork } from "../kernel/IUnitOfWork";
import { DomainEvent } from "./DomainEvent";
import { edaLog } from "./edaLog";
import { IConsumoStore } from "./IConsumoStore";
import { IEventHandler } from "./IEventHandler";

export class IdempotentHandler<E extends DomainEvent> implements IEventHandler<E> {
  constructor(
    private readonly inner: IEventHandler<E>,
    private readonly consumo: IConsumoStore,
    private readonly consumer: string,
    private readonly uow: IUnitOfWork = new NoopUnitOfWork()
  ) {}

  async handle(event: E): Promise<void> {
    if (!event.eventId) { await this.inner.handle(event); return; } 
    const dados = { eventId: event.eventId, correlationId: event.correlationId, evento: event.name };

    const iniciou = await this.consumo.iniciar({
      eventId: event.eventId, consumer: this.consumer, name: event.name,
      tenantId: event.tenantId, correlationId: event.correlationId ?? event.eventId,
    });
    if (!iniciou) { edaLog(this.consumer, "DUPLICATA ignorada", dados); return; }

    edaLog(this.consumer, "processando", dados);
    try {
      await this.uow.run(async () => {
        await this.inner.handle(event);
        await this.consumo.concluir(event.eventId, this.consumer);
      });
      edaLog(this.consumer, "processado", dados);
    } catch (err) {
      await this.consumo.falhar(event.eventId, this.consumer, (err as Error).message).catch(() => undefined);
      edaLog(this.consumer, "FALHOU (broker fará retry/DLQ)", { ...dados, erro: (err as Error).message });
      throw err;
    }
  }
}
