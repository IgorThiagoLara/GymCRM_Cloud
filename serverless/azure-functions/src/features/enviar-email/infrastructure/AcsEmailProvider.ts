import { EmailClient } from "@azure/communication-email";
import { IEmailProvider } from "../application/ports";
import { EmailMessage } from "../domain/EmailMessage";

export class AcsEmailProvider implements IEmailProvider {
  private readonly client: EmailClient;
  constructor(connectionString: string, private readonly remetente: string) {
    this.client = new EmailClient(connectionString);
  }

  async enviar(m: EmailMessage): Promise<void> {
    const poller = await this.client.beginSend({
      senderAddress: this.remetente,
      content: { subject: m.assunto, plainText: m.corpo },
      recipients: { to: [{ address: m.destinatario }] },
    });
    const result = await poller.pollUntilDone();
    if (result.status !== "Succeeded") throw new Error(`Azure Communication Services retornou status ${result.status}`);
  }
}
