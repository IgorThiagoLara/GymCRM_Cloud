import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { NotificacaoResumo } from "../domain/NotificacaoResumo";

export interface INotificacaoQuery {
  listar(ctx: TenantContext, limite: number): Promise<NotificacaoResumo[]>;
}
