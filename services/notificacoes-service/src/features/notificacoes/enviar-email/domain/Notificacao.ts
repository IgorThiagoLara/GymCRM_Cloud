import { randomUUID } from "crypto";
import { Entity } from "../../../../shared/kernel/Entity";

export type StatusNotificacao = "ENVIADA" | "FALHA";

export class Notificacao extends Entity {
  private constructor(
    id: string, tenantId: string,
    public readonly destinatario: string,
    public readonly assunto: string,
    public readonly corpo: string,
    public readonly status: StatusNotificacao,
    public readonly erro: string | null,
    public readonly criadaEm: Date
  ) { super(id, tenantId); }

  static registrar(p: { tenantId: string; destinatario: string; assunto: string; corpo: string; status: StatusNotificacao; erro?: string }): Notificacao {
    return new Notificacao(randomUUID(), p.tenantId, p.destinatario, p.assunto, p.corpo, p.status, p.erro ?? null, new Date());
  }

  static reconstituir(p: { id: string; tenantId: string; destinatario: string; assunto: string; corpo: string; status: StatusNotificacao; erro: string | null; criadaEm: Date }): Notificacao {
    return new Notificacao(p.id, p.tenantId, p.destinatario, p.assunto, p.corpo, p.status, p.erro, p.criadaEm);
  }
}
