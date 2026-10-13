import { Pool } from "pg";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { ICobrancaQuery } from "../application/ports";
import { CobrancaResumo } from "../domain/CobrancaResumo";

export class PostgresCobrancaQuery implements ICobrancaQuery {
  constructor(private readonly pool: Pool) {}
  async listar(ctx: TenantContext, filtro?: { matriculaId?: string }): Promise<CobrancaResumo[]> {
    const params: unknown[] = [ctx.tenantId];
    let where = "tenant_id = $1";
    if (filtro?.matriculaId) { params.push(filtro.matriculaId); where += ` AND matricula_id = $${params.length}`; }
    const { rows } = await this.pool.query(`SELECT * FROM cobrancas WHERE ${where} ORDER BY vencimento`, params);
    return rows.map((r) => ({ id: r.id, matriculaId: r.matricula_id, valor: Number(r.valor), vencimento: r.vencimento, status: r.status }));
  }
}
