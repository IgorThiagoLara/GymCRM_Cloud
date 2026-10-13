import { EmailMessage } from "../domain/EmailMessage";

export interface IEmailProvider {
  enviar(mensagem: EmailMessage): Promise<void>;
}
