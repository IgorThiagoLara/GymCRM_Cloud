import { Pool } from "pg";
import { migrateEventTables } from "../shared/persistence/eventTables";

export async function migrate(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cobrancas (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      matricula_id TEXT NOT NULL,
      valor NUMERIC(12,2) NOT NULL,
      vencimento TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cobrancas_tenant ON cobrancas (tenant_id, vencimento);
    CREATE INDEX IF NOT EXISTS idx_cobrancas_matricula ON cobrancas (tenant_id, matricula_id);
  `);
  await migrateEventTables(pool); 
}
