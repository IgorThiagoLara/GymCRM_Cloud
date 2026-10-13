import { randomUUID } from "crypto";
import { DomainEvent } from "../../../../shared/events/DomainEvent";

export class MatriculaCriadaEvent implements DomainEvent {
  readonly name = "MatriculaCriada";
  readonly occurredAt = new Date();
  readonly eventId = randomUUID();
  readonly correlationId = this.eventId;

  constructor(
    public readonly tenantId: string,
    public readonly matriculaId: string,
    public readonly alunoId: string,
    public readonly alunoEmail: string,
    public readonly planoId: string,
    public readonly valor: number
  ) {}
}
