import { InMemoryStore } from "../../../../shared/persistence/InMemoryStore";
import { INotificacaoRepository } from "../application/INotificacaoRepository";
import { Notificacao } from "../domain/Notificacao";
import { NotificacaoRow } from "./NotificacaoRow";

export class InMemoryNotificacaoRepository implements INotificacaoRepository {
  constructor(private readonly store: InMemoryStore<NotificacaoRow> = new InMemoryStore<NotificacaoRow>()) {}
  async salvar(n: Notificacao): Promise<void> {
    this.store.rows.set(n.id, {
      id: n.id, tenantId: n.tenantId, destinatario: n.destinatario, assunto: n.assunto, corpo: n.corpo,
      status: n.status, erro: n.erro, criadaEm: n.criadaEm,
    });
  }
}
