import { Queryable } from "../../../../shared/persistence/Queryable";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { ICobrancaRepository } from "../application/ICobrancaRepository";
import { Cobranca } from "../domain/Cobranca";
import { fromRow } from "./CobrancaRow";

export class PostgresCobrancaRepository implements ICobrancaRepository {
  constructor(private readonly pool: Queryable) {}

  private map = (r: any): Cobranca =>
    fromRow({ id: r.id, tenantId: r.tenant_id, matriculaId: r.matricula_id, valor: Number(r.valor), vencimento: r.vencimento, status: r.status });

  async save(c: Cobranca, ctx: TenantContext): Promise<void> {
    if (c.tenantId !== ctx.tenantId) throw new Error("Tentativa de gravar cobrança em outro tenant");
    await this.pool.query(
      `INSERT INTO cobrancas (id, tenant_id, matricula_id, valor, vencimento, status)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
      [c.id, c.tenantId, c.matriculaId, c.valor, c.vencimento, c.status]
    );
  }

  async findByMatricula(matriculaId: string, ctx: TenantContext): Promise<Cobranca[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM cobrancas WHERE tenant_id = $1 AND matricula_id = $2 ORDER BY vencimento", [ctx.tenantId, matriculaId]);
    return rows.map(this.map);
  }
}
