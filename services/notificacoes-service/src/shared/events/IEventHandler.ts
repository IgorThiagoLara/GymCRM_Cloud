import { DomainEvent } from "./DomainEvent";

export interface IEventHandler<E extends DomainEvent = DomainEvent> {
  handle(event: E): Promise<void>;
}
