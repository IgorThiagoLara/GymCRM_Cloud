import { DomainEvent } from "./DomainEvent";

export interface OutboxRecord { id: string; name: string; tenantId: string; payload: string; attempts: number }

export interface IOutboxStore {
  add(event: DomainEvent): Promise<void>;
  pendentes(limite: number): Promise<OutboxRecord[]>;
  marcarPublicado(id: string): Promise<void>;
  registrarFalha(id: string, erro: string): Promise<void>;
}
