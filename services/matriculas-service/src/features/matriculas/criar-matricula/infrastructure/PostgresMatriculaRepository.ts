import { Queryable } from "../../../../shared/persistence/Queryable";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { IMatriculaRepository } from "../application/ports";
import { Matricula } from "../domain/Matricula";
import { MatriculaDuplicadaError } from "../domain/MatriculaErrors";
import { fromRow } from "./MatriculaRow";

export class PostgresMatriculaRepository implements IMatriculaRepository {
  constructor(private readonly pool: Queryable) {}

  private map = (r: any): Matricula =>
    fromRow({
      id: r.id, tenantId: r.tenant_id, alunoId: r.aluno_id, turmaId: r.turma_id, planoId: r.plano_id,
      dataInicio: r.data_inicio, dataFim: r.data_fim, status: r.status,
    });

  async save(m: Matricula, ctx: TenantContext): Promise<void> {
    if (m.tenantId !== ctx.tenantId) throw new Error("Tentativa de gravar matrícula em outro tenant");
    try {
      await this.pool.query(
        `INSERT INTO matriculas (id, tenant_id, aluno_id, turma_id, plano_id, data_inicio, data_fim, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET data_fim = EXCLUDED.data_fim, status = EXCLUDED.status`,
        [m.id, m.tenantId, m.alunoId, m.turmaId, m.planoId, m.dataInicio, m.dataFim, m.status]
      );
    } catch (err: any) {
      if (err?.code === "23505") throw new MatriculaDuplicadaError();
      throw err;
    }
  }

  async findById(id: string, ctx: TenantContext): Promise<Matricula | null> {
    const { rows } = await this.pool.query("SELECT * FROM matriculas WHERE tenant_id = $1 AND id = $2", [ctx.tenantId, id]);
    return rows[0] ? this.map(rows[0]) : null;
  }

  async findAtivaByAluno(alunoId: string, ctx: TenantContext): Promise<Matricula | null> {
    const { rows } = await this.pool.query(
      "SELECT * FROM matriculas WHERE tenant_id = $1 AND aluno_id = $2 AND status = 'ATIVA' LIMIT 1",
      [ctx.tenantId, alunoId]
    );
    return rows[0] ? this.map(rows[0]) : null;
  }
}
