import { ConsumoInfo, IConsumoStore } from "../events/IConsumoStore";
import { Queryable } from "./Queryable";

export class PgConsumoStore implements IConsumoStore {
  constructor(private readonly db: Queryable) {}

  async iniciar(i: ConsumoInfo): Promise<boolean> {
    const { rows } = await this.db.query(
      `INSERT INTO eventos_consumo (event_id, consumer, name, tenant_id, correlation_id, status, tentativas, updated_at)
       VALUES ($1,$2,$3,$4,$5,'PROCESSANDO',1, now())
       ON CONFLICT (event_id, consumer) DO UPDATE
         SET status = 'PROCESSANDO', tentativas = eventos_consumo.tentativas + 1, updated_at = now()
         WHERE eventos_consumo.status = 'FALHA'
            OR (eventos_consumo.status = 'PROCESSANDO' AND eventos_consumo.updated_at < now() - interval '60 seconds')
       RETURNING event_id`,
      [i.eventId, i.consumer, i.name, i.tenantId, i.correlationId]
    );
    return rows.length > 0;
  }

  async concluir(eventId: string, consumer: string): Promise<void> {
    await this.db.query("UPDATE eventos_consumo SET status='PROCESSADO', ultimo_erro=NULL, updated_at=now() WHERE event_id=$1 AND consumer=$2", [eventId, consumer]);
  }

  async falhar(eventId: string, consumer: string, erro: string): Promise<void> {
    await this.db.query("UPDATE eventos_consumo SET status='FALHA', ultimo_erro=$3, updated_at=now() WHERE event_id=$1 AND consumer=$2",
      [eventId, consumer, erro.slice(0, 500)]);
  }
}
