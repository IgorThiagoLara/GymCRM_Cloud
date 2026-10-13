import { Downstream, EventoDTO, Session } from "../types";
import { opcional } from "./degradacao";

export interface EtapaView {
  servico: string; evento: string; direcao: "PUBLICACAO" | "CONSUMO"; status: string;
  tentativas: number; erro: string | null; em: string;
}
export interface FluxoView {
  correlationId: string;
  inicio: string;
  status: "CONCLUIDO" | "EM_ANDAMENTO" | "COM_FALHA";
  etapas: EtapaView[];
}
export interface EventosResponse {
  resumo: { fluxos: number; concluidos: number; emAndamento: number; comFalha: number };
  fluxos: FluxoView[];
  degradado: string[];
}

const ABERTOS = new Set(["PENDENTE", "PROCESSANDO"]);

export async function montarEventos(d: Downstream, s: Session): Promise<EventosResponse> {
  const degradado: string[] = [];
  const listas = await Promise.all([
    opcional("matriculas", d.matriculas.eventos(s), [] as EventoDTO[], degradado),
    opcional("financeiro", d.financeiro.eventos(s), [] as EventoDTO[], degradado),
    opcional("notificacoes", d.notificacoes.eventos(s), [] as EventoDTO[], degradado),
  ]);

  const porFluxo = new Map<string, EventoDTO[]>();
  for (const e of listas.flat()) {
    const lista = porFluxo.get(e.correlationId) ?? [];
    lista.push(e);
    porFluxo.set(e.correlationId, lista);
  }

  const fluxos: FluxoView[] = [...porFluxo.entries()].map(([correlationId, eventos]) => {
    const ordenados = [...eventos].sort((a, b) => +new Date(a.em) - +new Date(b.em) || (a.direcao === "PUBLICACAO" ? -1 : 1));
    const etapas = ordenados.map<EtapaView>((e) => ({
      servico: e.servico, evento: e.name, direcao: e.direcao, status: e.status, tentativas: e.tentativas, erro: e.erro, em: e.em,
    }));
    const status: FluxoView["status"] = etapas.some((e) => e.status === "FALHA")
      ? "COM_FALHA"
      : etapas.some((e) => ABERTOS.has(e.status)) ? "EM_ANDAMENTO" : "CONCLUIDO";
    return { correlationId, inicio: etapas[0].em, status, etapas };
  }).sort((a, b) => +new Date(b.inicio) - +new Date(a.inicio)).slice(0, 30);

  return {
    resumo: {
      fluxos: fluxos.length,
      concluidos: fluxos.filter((f) => f.status === "CONCLUIDO").length,
      emAndamento: fluxos.filter((f) => f.status === "EM_ANDAMENTO").length,
      comFalha: fluxos.filter((f) => f.status === "COM_FALHA").length,
    },
    fluxos,
    degradado: [...new Set(degradado)],
  };
}
