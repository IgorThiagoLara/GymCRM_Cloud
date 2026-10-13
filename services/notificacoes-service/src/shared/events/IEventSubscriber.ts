import { DomainEvent } from "./DomainEvent";
import { IEventHandler } from "./IEventHandler";

export interface IEventSubscriber {
  subscribe<E extends DomainEvent>(eventName: string, handler: IEventHandler<E>): void;
}
