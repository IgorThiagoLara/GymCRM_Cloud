import { Downstream, Session } from "../types";
import { opcional } from "./degradacao";

export interface MatriculaView {
  id: string;
  status: string;
  dataInicio: string;
  dataFim: string;
  turmaId: string;
  aluno: { id: string; nome: string | null; email: string | null };
  plano: { id: string; nome: string | null; valor: number | null };
  cobranca: { status: string; valor: number; vencimento: string } | null;
}

export interface MatriculasResponse { itens: MatriculaView[]; degradado: string[] }

export async function montarMatriculas(d: Downstream, s: Session): Promise<MatriculasResponse> {
  const degradado: string[] = [];
  const [matriculas, alunos, planos, cobrancas] = await Promise.all([
    d.matriculas.listar(s),
    opcional("cadastros", d.cadastros.alunos(s), [], degradado),
    opcional("cadastros", d.cadastros.planos(s), [], degradado),
    opcional("financeiro", d.financeiro.cobrancas(s), [], degradado),
  ]);

  const alunoPorId = new Map(alunos.map((a) => [a.id, a]));
  const planoPorId = new Map(planos.map((p) => [p.id, p]));
  const cobrancaPorMatricula = new Map(cobrancas.map((c) => [c.matriculaId, c]));

  const itens = matriculas.map<MatriculaView>((m) => {
    const aluno = alunoPorId.get(m.alunoId);
    const plano = planoPorId.get(m.planoId);
    const c = cobrancaPorMatricula.get(m.id);
    return {
      id: m.id,
      status: m.status,
      dataInicio: m.dataInicio,
      dataFim: m.dataFim,
      turmaId: m.turmaId,
      aluno: { id: m.alunoId, nome: aluno?.nome ?? null, email: aluno?.email ?? null },
      plano: { id: m.planoId, nome: plano?.nome ?? null, valor: plano?.valor ?? null },
      cobranca: c ? { status: c.status, valor: c.valor, vencimento: c.vencimento } : null,
    };
  });
  return { itens, degradado: [...new Set(degradado)] };
}
