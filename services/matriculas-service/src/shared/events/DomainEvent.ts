export interface DomainEvent {
  readonly eventId: string;
  readonly correlationId: string;
  readonly name: string;
  readonly occurredAt: Date;
  readonly tenantId: string;
}
