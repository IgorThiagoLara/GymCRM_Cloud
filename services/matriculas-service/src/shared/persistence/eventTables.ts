import { Pool } from "pg";

export async function migrateEventTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      published_at TIMESTAMPTZ,
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_outbox_pendentes ON outbox (created_at) WHERE published_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_outbox_tenant ON outbox (tenant_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS eventos_consumo (
      event_id TEXT NOT NULL,
      consumer TEXT NOT NULL,
      name TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      status TEXT NOT NULL,
      tentativas INT NOT NULL DEFAULT 1,
      ultimo_erro TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (event_id, consumer)
    );
    CREATE INDEX IF NOT EXISTS idx_consumo_tenant ON eventos_consumo (tenant_id, updated_at DESC);
  `);
}
