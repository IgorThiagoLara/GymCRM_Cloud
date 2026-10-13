import { IEventPublisher } from "../../../../shared/events/IEventPublisher";
import { Result } from "../../../../shared/kernel/Result";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { Cobranca } from "../domain/Cobranca";
import { CobrancaGeradaEvent } from "../domain/CobrancaGeradaEvent";
import { ICobrancaRepository } from "./ICobrancaRepository";

export interface GerarCobrancaCommand {
  matriculaId: string;
  alunoEmail: string;
  valor: number;
  correlationId?: string;
}

export class GerarCobrancaUseCase {
  constructor(private readonly cobrancas: ICobrancaRepository, private readonly events: IEventPublisher) {}

  async execute(cmd: GerarCobrancaCommand, ctx: TenantContext): Promise<Result<{ cobrancaId: string }>> {
    const criada = Cobranca.gerar({ tenantId: ctx.tenantId, matriculaId: cmd.matriculaId, valor: cmd.valor });
    if (!criada.isSuccess) return Result.fail<{ cobrancaId: string }>(criada.error);

    const cobranca = criada.value;
    await this.cobrancas.save(cobranca, ctx);
    await this.events.publish(
      new CobrancaGeradaEvent(ctx.tenantId, cobranca.id, cmd.matriculaId, cmd.alunoEmail, cobranca.valor, cobranca.vencimento, cmd.correlationId)
    );
    return Result.ok({ cobrancaId: cobranca.id });
  }
}
