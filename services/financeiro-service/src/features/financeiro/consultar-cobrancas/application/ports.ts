import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { CobrancaResumo } from "../domain/CobrancaResumo";

export interface ICobrancaQuery {
  listar(ctx: TenantContext, filtro?: { matriculaId?: string }): Promise<CobrancaResumo[]>;
}
