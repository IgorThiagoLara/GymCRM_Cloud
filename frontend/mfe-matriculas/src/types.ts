// Contratos do BFF consumidos por este microfrontend (view models, não entidades de domínio).
export interface MatriculaView {
  id: string; status: string; dataInicio: string; dataFim: string; turmaId: string;
  aluno: { id: string; nome: string | null; email: string | null };
  plano: { id: string; nome: string | null; valor: number | null };
  cobranca: { status: string; valor: number; vencimento: string } | null;
}
export interface MatriculasResponse { itens: MatriculaView[]; degradado: string[] }
export interface Opcoes {
  alunos: { id: string; nome: string; email: string }[];
  planos: { id: string; nome: string; valor: number; duracaoMeses: number }[];
}
