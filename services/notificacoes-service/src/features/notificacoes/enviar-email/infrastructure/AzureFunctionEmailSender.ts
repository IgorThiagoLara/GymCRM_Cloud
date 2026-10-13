import { INotificationSender, Mensagem } from "../application/INotificationSender";

export interface AzureFunctionEmailOptions {
  url: string;
  functionKey?: string;
  timeoutMs?: number;
}

export class AzureFunctionEmailSender implements INotificationSender {
  constructor(private readonly o: AzureFunctionEmailOptions) {}

  async enviar(m: Mensagem): Promise<void> {
    const res = await fetch(this.o.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.o.functionKey ? { "x-functions-key": this.o.functionKey } : {}),
        ...(m.correlationId ? { "x-correlation-id": m.correlationId } : {}),
        ...(m.referencia ? { "x-idempotency-key": m.referencia } : {}),
      },
      body: JSON.stringify({ destinatario: m.destinatario, assunto: m.assunto, corpo: m.corpo, referencia: m.referencia }),
      signal: AbortSignal.timeout(this.o.timeoutMs ?? 10000),
    });
    if (!res.ok) throw new Error(`Azure Function de e-mail respondeu HTTP ${res.status}`);
  }
}
