import { InMemoryStore } from "../../../../shared/persistence/InMemoryStore";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { IMatriculaQuery } from "../application/ports";
import { MatriculaResumo } from "../domain/MatriculaResumo";

interface Row { id: string; tenantId: string; alunoId: string; turmaId: string; planoId: string; dataInicio: Date; dataFim: Date; status: string }

export class InMemoryMatriculaQuery implements IMatriculaQuery {
  constructor(private readonly store: InMemoryStore<Row>) {}
  async listar(ctx: TenantContext, filtro?: { alunoId?: string }): Promise<MatriculaResumo[]> {
    return [...this.store.rows.values()]
      .filter((r) => r.tenantId === ctx.tenantId && (!filtro?.alunoId || r.alunoId === filtro.alunoId))
      .sort((a, b) => b.dataInicio.getTime() - a.dataInicio.getTime())
      .map(({ tenantId: _t, ...rest }) => rest);
  }
}
