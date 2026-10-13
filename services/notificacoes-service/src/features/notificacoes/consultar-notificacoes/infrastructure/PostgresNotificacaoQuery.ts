import { Pool } from "pg";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { INotificacaoQuery } from "../application/ports";
import { NotificacaoResumo } from "../domain/NotificacaoResumo";

export class PostgresNotificacaoQuery implements INotificacaoQuery {
  constructor(private readonly pool: Pool) {}
  async listar(ctx: TenantContext, limite: number): Promise<NotificacaoResumo[]> {
    const { rows } = await this.pool.query(
      "SELECT id, destinatario, assunto, status, criada_em FROM notificacoes WHERE tenant_id = $1 ORDER BY criada_em DESC LIMIT $2",
      [ctx.tenantId, limite]);
    return rows.map((r) => ({ id: r.id, destinatario: r.destinatario, assunto: r.assunto, status: r.status, criadaEm: r.criada_em }));
  }
}
