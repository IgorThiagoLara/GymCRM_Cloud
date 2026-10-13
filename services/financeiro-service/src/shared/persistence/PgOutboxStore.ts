import { DomainEvent } from "../events/DomainEvent";
import { IOutboxStore, OutboxRecord } from "../events/IOutboxStore";
import { Queryable } from "./Queryable";

export class PgOutboxStore implements IOutboxStore {
  constructor(private readonly db: Queryable) {}

  async add(event: DomainEvent): Promise<void> {
    await this.db.query(
      "INSERT INTO outbox (id, name, tenant_id, correlation_id, payload) VALUES ($1,$2,$3,$4,$5)",
      [event.eventId, event.name, event.tenantId, event.correlationId, JSON.stringify(event)]
    );
  }

  async pendentes(limite: number): Promise<OutboxRecord[]> {
    const { rows } = await this.db.query(
      "SELECT id, name, tenant_id, payload, attempts FROM outbox WHERE published_at IS NULL ORDER BY created_at LIMIT $1", [limite]);
    return rows.map((r) => ({
      id: r.id, name: r.name, tenantId: r.tenant_id, attempts: r.attempts,
      payload: typeof r.payload === "string" ? r.payload : JSON.stringify(r.payload),
    }));
  }

  async marcarPublicado(id: string): Promise<void> {
    await this.db.query("UPDATE outbox SET published_at = now(), attempts = attempts + 1, last_error = NULL WHERE id = $1", [id]);
  }

  async registrarFalha(id: string, erro: string): Promise<void> {
    await this.db.query("UPDATE outbox SET attempts = attempts + 1, last_error = $2 WHERE id = $1", [id, erro.slice(0, 500)]);
  }
}
