import { Pool } from "pg";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { IPlanoRepository } from "../application/ports";
import { Plano } from "../domain/Plano";

export class PostgresPlanoRepository implements IPlanoRepository {
  constructor(private readonly pool: Pool) {}

  private map = (r: any): Plano =>
    Plano.reconstituir({ id: r.id, tenantId: r.tenant_id, nome: r.nome, valor: Number(r.valor), duracaoMeses: r.duracao_meses });

  async listar(ctx: TenantContext): Promise<Plano[]> {
    const { rows } = await this.pool.query("SELECT * FROM planos WHERE tenant_id = $1 ORDER BY valor", [ctx.tenantId]);
    return rows.map(this.map);
  }
  async obter(id: string, ctx: TenantContext): Promise<Plano | null> {
    const { rows } = await this.pool.query("SELECT * FROM planos WHERE tenant_id = $1 AND id = $2", [ctx.tenantId, id]);
    return rows[0] ? this.map(rows[0]) : null;
  }
}
