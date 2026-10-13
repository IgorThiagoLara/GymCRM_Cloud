import { Notificacao } from "../domain/Notificacao";
import { INotificacaoRepository } from "./INotificacaoRepository";
import { INotificationSender } from "./INotificationSender";

export interface EnviarNotificacaoCommand {
  tenantId: string;
  destinatario: string;
  assunto: string;
  corpo: string;
  referencia?: string;
  correlationId?: string;
}

export class EnviarNotificacaoUseCase {
  constructor(
    private readonly sender: INotificationSender,
    private readonly historico: INotificacaoRepository
  ) {}

  async execute(cmd: EnviarNotificacaoCommand): Promise<void> {
    const { tenantId, ...mensagem } = cmd;
    try {
      await this.sender.enviar(mensagem);
      await this.historico.salvar(Notificacao.registrar({ tenantId, ...mensagem, status: "ENVIADA" }));
    } catch (err) {
      await this.historico.salvar(Notificacao.registrar({ tenantId, ...mensagem, status: "FALHA", erro: (err as Error).message }));
      throw err;
    }
  }
}
