import { DomainEvent } from "./DomainEvent";
import { IEventHandler } from "./IEventHandler";
import { IEventPublisher } from "./IEventPublisher";
import { IEventSubscriber } from "./IEventSubscriber";

export class InMemoryEventBus implements IEventPublisher, IEventSubscriber {
  private handlers = new Map<string, IEventHandler<any>[]>();

  subscribe<E extends DomainEvent>(eventName: string, handler: IEventHandler<E>): void {
    const list = this.handlers.get(eventName) ?? [];
    list.push(handler);
    this.handlers.set(eventName, list);
  }

  async publish(event: DomainEvent): Promise<void> {
    const list = this.handlers.get(event.name) ?? [];
    const results = await Promise.allSettled(list.map((h) => h.handle(event)));
    for (const r of results) {
      if (r.status === "rejected") {
        console.error(`[EventBus] handler falhou para ${event.name}:`, r.reason);
      }
    }
  }
}
