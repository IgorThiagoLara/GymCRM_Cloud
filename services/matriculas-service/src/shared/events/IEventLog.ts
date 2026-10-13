import { TenantContext } from "../kernel/TenantContext";

export interface EventoRegistro {
  eventId: string;
  correlationId: string;
  name: string;
  tenantId: string;
  direcao: "PUBLICACAO" | "CONSUMO";
  status: string;
  tentativas: number;
  erro: string | null;
  em: Date;
}

export interface IEventLogQuery {
  listar(ctx: TenantContext, limite: number): Promise<EventoRegistro[]>;
}
