import { IEmailProvider } from "../application/ports";
import { EmailMessage } from "../domain/EmailMessage";

export class ConsoleEmailProvider implements IEmailProvider {
  async enviar(m: EmailMessage): Promise<void> {
    console.log(`[EMAIL] para=${m.destinatario} | ${m.assunto} | ${m.corpo}`);
  }
}
