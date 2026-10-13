import { Pool } from "pg";
import { INotificacaoRepository } from "../application/INotificacaoRepository";
import { Notificacao } from "../domain/Notificacao";

export class PostgresNotificacaoRepository implements INotificacaoRepository {
  constructor(private readonly pool: Pool) {}
  async salvar(n: Notificacao): Promise<void> {
    await this.pool.query(
      `INSERT INTO notificacoes (id, tenant_id, destinatario, assunto, corpo, status, erro, criada_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [n.id, n.tenantId, n.destinatario, n.assunto, n.corpo, n.status, n.erro, n.criadaEm]
    );
  }
}
