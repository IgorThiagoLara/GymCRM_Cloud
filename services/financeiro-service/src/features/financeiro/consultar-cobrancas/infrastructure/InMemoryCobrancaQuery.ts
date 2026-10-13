import { InMemoryStore } from "../../../../shared/persistence/InMemoryStore";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { ICobrancaQuery } from "../application/ports";
import { CobrancaResumo } from "../domain/CobrancaResumo";

interface Row { id: string; tenantId: string; matriculaId: string; valor: number; vencimento: Date; status: string }

export class InMemoryCobrancaQuery implements ICobrancaQuery {
  constructor(private readonly store: InMemoryStore<Row>) {}
  async listar(ctx: TenantContext, filtro?: { matriculaId?: string }): Promise<CobrancaResumo[]> {
    return [...this.store.rows.values()]
      .filter((r) => r.tenantId === ctx.tenantId && (!filtro?.matriculaId || r.matriculaId === filtro.matriculaId))
      .sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())
      .map(({ tenantId: _t, ...rest }) => rest);
  }
}
