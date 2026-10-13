import { DomainEvent } from "../events/DomainEvent";
import { edaLog } from "../events/edaLog";
import { IEventPublisher } from "../events/IEventPublisher";
import { IOutboxStore } from "../events/IOutboxStore";

export class OutboxEventPublisher implements IEventPublisher {
  constructor(private readonly outbox: IOutboxStore, private readonly servico: string) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.outbox.add(event);
    edaLog(this.servico, "outbox+ (aguardando relay)", { eventId: event.eventId, correlationId: event.correlationId, evento: event.name });
  }
}
