import { Notificacao } from "../domain/Notificacao";

export interface INotificacaoRepository {
  salvar(notificacao: Notificacao): Promise<void>;
}
