export interface Mensagem {
  destinatario: string;
  assunto: string;
  corpo: string;
  referencia?: string;
  correlationId?: string;
}

export interface INotificationSender {
  enviar(mensagem: Mensagem): Promise<void>;
}
