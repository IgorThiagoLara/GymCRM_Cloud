import { Pool } from "pg";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { IAlunoRepository } from "../application/ports";
import { Aluno } from "../domain/Aluno";

export class PostgresAlunoRepository implements IAlunoRepository {
  constructor(private readonly pool: Pool) {}

  private map = (r: any): Aluno => Aluno.reconstituir({ id: r.id, tenantId: r.tenant_id, nome: r.nome, email: r.email });

  async listar(ctx: TenantContext): Promise<Aluno[]> {
    const { rows } = await this.pool.query("SELECT * FROM alunos WHERE tenant_id = $1 ORDER BY nome", [ctx.tenantId]);
    return rows.map(this.map);
  }
  async obter(id: string, ctx: TenantContext): Promise<Aluno | null> {
    const { rows } = await this.pool.query("SELECT * FROM alunos WHERE tenant_id = $1 AND id = $2", [ctx.tenantId, id]);
    return rows[0] ? this.map(rows[0]) : null;
  }
}
