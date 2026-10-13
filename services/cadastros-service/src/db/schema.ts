import { Pool } from "pg";

export async function migrate(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alunos (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, nome TEXT NOT NULL, email TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_alunos_tenant ON alunos (tenant_id);
    CREATE TABLE IF NOT EXISTS planos (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, nome TEXT NOT NULL,
      valor NUMERIC(12,2) NOT NULL, duracao_meses INT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_planos_tenant ON planos (tenant_id);
  `);
  for (const a of SEED_ALUNOS)
    await pool.query("INSERT INTO alunos (id, tenant_id, nome, email) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING",
      [a.id, a.tenantId, a.nome, a.email]);
  for (const p of SEED_PLANOS)
    await pool.query("INSERT INTO planos (id, tenant_id, nome, valor, duracao_meses) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING",
      [p.id, p.tenantId, p.nome, p.valor, p.duracaoMeses]);
}

export const SEED_ALUNOS = [
  { tenantId: "academia-a", id: "aluno-1", nome: "Maria Silva", email: "maria@exemplo.com" },
  { tenantId: "academia-a", id: "aluno-3", nome: "Carlos Souza", email: "carlos@exemplo.com" },
  { tenantId: "academia-b", id: "aluno-2", nome: "João Pereira", email: "joao@exemplo.com" },
];

export const SEED_PLANOS = [
  { tenantId: "academia-a", id: "plano-mensal", nome: "Mensal", valor: 99.9, duracaoMeses: 1 },
  { tenantId: "academia-a", id: "plano-trimestral", nome: "Trimestral", valor: 269.9, duracaoMeses: 3 },
  { tenantId: "academia-b", id: "plano-anual", nome: "Anual", valor: 899, duracaoMeses: 12 },
];
