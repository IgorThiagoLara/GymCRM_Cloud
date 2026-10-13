import { INotificationSender, Mensagem } from "../application/INotificationSender";

export class FalhaSimuladaEmailSender implements INotificationSender {
  private restantes: number;
  constructor(private readonly inner: INotificationSender, falhas: number) { this.restantes = falhas; }

  async enviar(m: Mensagem): Promise<void> {
    if (this.restantes > 0) {
      this.restantes--;
      throw new Error("falha simulada do provedor de e-mail (demo de retry)");
    }
    await this.inner.enviar(m);
  }
}
