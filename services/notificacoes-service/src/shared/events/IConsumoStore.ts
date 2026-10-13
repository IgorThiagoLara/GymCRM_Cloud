export interface ConsumoInfo { eventId: string; consumer: string; name: string; tenantId: string; correlationId: string }

export interface IConsumoStore {
  iniciar(info: ConsumoInfo): Promise<boolean>;
  concluir(eventId: string, consumer: string): Promise<void>;
  falhar(eventId: string, consumer: string, erro: string): Promise<void>;
}
