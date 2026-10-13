import { INotificationSender, Mensagem } from "../application/INotificationSender";

export class ConsoleEmailSender implements INotificationSender {
  async enviar(m: Mensagem): Promise<void> {
    console.log(`[EMAIL] para=${m.destinatario} | ${m.assunto} | ${m.corpo}`);
  }
}
