import { Pool } from "pg";
import { migrateEventTables } from "../shared/persistence/eventTables";

export async function migrate(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS matriculas (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      aluno_id TEXT NOT NULL,
      turma_id TEXT NOT NULL,
      plano_id TEXT NOT NULL,
      data_inicio TIMESTAMPTZ NOT NULL,
      data_fim TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_matriculas_tenant ON matriculas (tenant_id, data_inicio DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_matricula_ativa_por_aluno ON matriculas (tenant_id, aluno_id) WHERE status = 'ATIVA';
  `);
  await migrateEventTables(pool);
}
