import { Pool } from "pg";
import { migrateEventTables } from "../shared/persistence/eventTables";

export async function migrate(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notificacoes (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      destinatario TEXT NOT NULL,
      assunto TEXT NOT NULL,
      corpo TEXT NOT NULL,
      status TEXT NOT NULL,
      erro TEXT,
      criada_em TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant ON notificacoes (tenant_id, criada_em DESC);
  `);
  await migrateEventTables(pool);
}
