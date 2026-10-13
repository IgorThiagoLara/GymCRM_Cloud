import { Downstream, Session } from "../types";
import { opcional } from "./degradacao";

export interface CobrancaView {
  id: string;
  matriculaId: string;
  valor: number;
  vencimento: string;
  status: string;
  alunoNome: string | null;
  planoNome: string | null;
}
export interface CobrancasResponse { itens: CobrancaView[]; totais: { pendente: number; paga: number; recusada: number }; degradado: string[] }

export async function montarCobrancas(d: Downstream, s: Session): Promise<CobrancasResponse> {
  const degradado: string[] = [];
  const cobrancas = await d.financeiro.cobrancas(s);
  const [matriculas, alunos, planos] = await Promise.all([
    opcional("matriculas", d.matriculas.listar(s), [], degradado),
    opcional("cadastros", d.cadastros.alunos(s), [], degradado),
    opcional("cadastros", d.cadastros.planos(s), [], degradado),
  ]);
  const matriculaPorId = new Map(matriculas.map((m) => [m.id, m]));
  const alunoPorId = new Map(alunos.map((a) => [a.id, a]));
  const planoPorId = new Map(planos.map((p) => [p.id, p]));

  const itens = cobrancas.map<CobrancaView>((c) => {
    const m = matriculaPorId.get(c.matriculaId);
    return {
      id: c.id, matriculaId: c.matriculaId, valor: c.valor, vencimento: c.vencimento, status: c.status,
      alunoNome: (m && alunoPorId.get(m.alunoId)?.nome) ?? null,
      planoNome: (m && planoPorId.get(m.planoId)?.nome) ?? null,
    };
  });
  const soma = (st: string) => itens.filter((i) => i.status === st).reduce((t, i) => t + i.valor, 0);
  return {
    itens,
    totais: { pendente: soma("PENDENTE"), paga: soma("PAGA"), recusada: soma("RECUSADA") },
    degradado: [...new Set(degradado)],
  };
}
