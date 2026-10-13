import { DomainEvent } from "../../../../shared/events/DomainEvent";
import { IEventHandler } from "../../../../shared/events/IEventHandler";
import { EnviarNotificacaoUseCase } from "./EnviarNotificacaoUseCase";

interface CobrancaGeradaPayload extends DomainEvent {
  alunoEmail: string;
  valor: number;
  vencimento: string | Date;
}

export class CobrancaGeradaHandler implements IEventHandler<CobrancaGeradaPayload> {
  constructor(private readonly enviar: EnviarNotificacaoUseCase) {}

  async handle(event: CobrancaGeradaPayload): Promise<void> {
    const vencimento = new Date(event.vencimento);
    await this.enviar.execute({
      tenantId: event.tenantId,
      referencia: event.eventId,
      correlationId: event.correlationId,
      destinatario: event.alunoEmail,
      assunto: "Nova mensalidade gerada",
      corpo: `Sua mensalidade de R$ ${event.valor.toFixed(2)} vence em ${vencimento.toLocaleDateString("pt-BR")}.`,
    });
  }
}
