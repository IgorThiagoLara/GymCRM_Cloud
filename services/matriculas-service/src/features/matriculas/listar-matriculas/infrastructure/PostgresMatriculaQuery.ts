import { Pool } from "pg";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { IMatriculaQuery } from "../application/ports";
import { MatriculaResumo } from "../domain/MatriculaResumo";

export class PostgresMatriculaQuery implements IMatriculaQuery {
  constructor(private readonly pool: Pool) {}
  async listar(ctx: TenantContext, filtro?: { alunoId?: string }): Promise<MatriculaResumo[]> {
    const params: unknown[] = [ctx.tenantId];
    let where = "tenant_id = $1";
    if (filtro?.alunoId) { params.push(filtro.alunoId); where += ` AND aluno_id = $${params.length}`; }
    const { rows } = await this.pool.query(`SELECT * FROM matriculas WHERE ${where} ORDER BY data_inicio DESC`, params);
    return rows.map((r) => ({
      id: r.id, alunoId: r.aluno_id, turmaId: r.turma_id, planoId: r.plano_id,
      status: r.status, dataInicio: r.data_inicio, dataFim: r.data_fim,
    }));
  }
}
