import { InMemoryStore } from "../../../../shared/persistence/InMemoryStore";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { INotificacaoQuery } from "../application/ports";
import { NotificacaoResumo } from "../domain/NotificacaoResumo";

interface Row { id: string; tenantId: string; destinatario: string; assunto: string; status: string; criadaEm: Date }

export class InMemoryNotificacaoQuery implements INotificacaoQuery {
  constructor(private readonly store: InMemoryStore<Row>) {}
  async listar(ctx: TenantContext, limite: number): Promise<NotificacaoResumo[]> {
    return [...this.store.rows.values()]
      .filter((r) => r.tenantId === ctx.tenantId)
      .sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime())
      .slice(0, limite)
      .map((r) => ({ id: r.id, destinatario: r.destinatario, assunto: r.assunto, status: r.status, criadaEm: r.criadaEm }));
  }
}
