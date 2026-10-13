import { DomainEvent } from "../../../../shared/events/DomainEvent";
import { IEventHandler } from "../../../../shared/events/IEventHandler";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { GerarCobrancaUseCase } from "./GerarCobrancaUseCase";

interface MatriculaCriadaPayload extends DomainEvent {
  matriculaId: string;
  alunoEmail: string;
  valor: number;
}

export class MatriculaCriadaHandler implements IEventHandler<MatriculaCriadaPayload> {
  constructor(private readonly gerarCobranca: GerarCobrancaUseCase) {}

  async handle(event: MatriculaCriadaPayload): Promise<void> {
    const ctx: TenantContext = { tenantId: event.tenantId, userId: "system", perfil: "ADMIN" };
    const result = await this.gerarCobranca.execute(
      { matriculaId: event.matriculaId, alunoEmail: event.alunoEmail, valor: event.valor, correlationId: event.correlationId },
      ctx
    );
    if (!result.isSuccess) throw new Error(`Falha ao gerar cobrança: ${result.error.message}`);
  }
}
