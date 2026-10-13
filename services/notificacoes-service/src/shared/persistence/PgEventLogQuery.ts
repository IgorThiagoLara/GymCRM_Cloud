import { EventoRegistro, IEventLogQuery } from "../events/IEventLog";
import { TenantContext } from "../kernel/TenantContext";
import { Queryable } from "./Queryable";

export class PgEventLogQuery implements IEventLogQuery {
  constructor(private readonly db: Queryable) {}

  async listar(ctx: TenantContext, limite: number): Promise<EventoRegistro[]> {
    const [pub, con] = await Promise.all([
      this.db.query(
        `SELECT id, correlation_id, name, tenant_id, published_at, attempts, last_error, created_at
           FROM outbox WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`, [ctx.tenantId, limite]),
      this.db.query(
        `SELECT event_id, correlation_id, name, tenant_id, status, tentativas, ultimo_erro, updated_at
           FROM eventos_consumo WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT $2`, [ctx.tenantId, limite]),
    ]);
    const publicados: EventoRegistro[] = pub.rows.map((r) => ({
      eventId: r.id, correlationId: r.correlation_id, name: r.name, tenantId: r.tenant_id, direcao: "PUBLICACAO",
      status: r.published_at ? "PUBLICADO" : "PENDENTE", tentativas: r.attempts, erro: r.last_error,
      em: r.published_at ?? r.created_at,
    }));
    const consumidos: EventoRegistro[] = con.rows.map((r) => ({
      eventId: r.event_id, correlationId: r.correlation_id, name: r.name, tenantId: r.tenant_id, direcao: "CONSUMO",
      status: r.status, tentativas: r.tentativas, erro: r.ultimo_erro, em: r.updated_at,
    }));
    return [...publicados, ...consumidos].sort((a, b) => +new Date(b.em) - +new Date(a.em)).slice(0, limite);
  }
}
