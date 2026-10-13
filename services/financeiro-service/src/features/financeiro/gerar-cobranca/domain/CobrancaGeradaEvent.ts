import { randomUUID } from "crypto";
import { DomainEvent } from "../../../../shared/events/DomainEvent";

export class CobrancaGeradaEvent implements DomainEvent {
  readonly name = "CobrancaGerada";
  readonly occurredAt = new Date();
  readonly eventId = randomUUID();

  constructor(
    public readonly tenantId: string,
    public readonly cobrancaId: string,
    public readonly matriculaId: string,
    public readonly alunoEmail: string,
    public readonly valor: number,
    public readonly vencimento: Date,
    public readonly correlationId: string = randomUUID()
  ) {}
}
