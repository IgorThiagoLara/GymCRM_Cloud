import { Result } from "../../../../shared/kernel/Result";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { CobrancaResumo } from "../domain/CobrancaResumo";
import { ICobrancaQuery } from "./ports";

export class ConsultarCobrancasUseCase {
  constructor(private readonly query: ICobrancaQuery) {}
  async execute(ctx: TenantContext, filtro?: { matriculaId?: string }): Promise<Result<CobrancaResumo[]>> {
    return Result.ok(await this.query.listar(ctx, filtro));
  }
}
