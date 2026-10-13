import { Result } from "../../../../shared/kernel/Result";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { NotificacaoResumo } from "../domain/NotificacaoResumo";
import { INotificacaoQuery } from "./ports";

export class ConsultarNotificacoesUseCase {
  constructor(private readonly query: INotificacaoQuery) {}
  async execute(ctx: TenantContext, limite = 50): Promise<Result<NotificacaoResumo[]>> {
    return Result.ok(await this.query.listar(ctx, Math.min(Math.max(limite, 1), 200)));
  }
}
