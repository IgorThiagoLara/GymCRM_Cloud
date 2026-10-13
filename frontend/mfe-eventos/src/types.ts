export interface EtapaView {
  servico: string; evento: string; direcao: "PUBLICACAO" | "CONSUMO"; status: string;
  tentativas: number; erro: string | null; em: string;
}
export interface FluxoView {
  correlationId: string; inicio: string; status: "CONCLUIDO" | "EM_ANDAMENTO" | "COM_FALHA"; etapas: EtapaView[];
}
export interface EventosResponse {
  resumo: { fluxos: number; concluidos: number; emAndamento: number; comFalha: number };
  fluxos: FluxoView[];
  degradado: string[];
}
