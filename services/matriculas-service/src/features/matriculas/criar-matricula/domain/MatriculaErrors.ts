import { DomainError } from "../../../../shared/kernel/DomainError";

export class AlunoNaoEncontradoError extends DomainError {
  constructor() { super("ALUNO_NAO_ENCONTRADO", "Aluno não encontrado para este tenant."); }
}
export class PlanoNaoEncontradoError extends DomainError {
  constructor() { super("PLANO_NAO_ENCONTRADO", "Plano não encontrado para este tenant."); }
}
export class MatriculaDuplicadaError extends DomainError {
  constructor() { super("MATRICULA_DUPLICADA", "O aluno já possui uma matrícula ativa."); }
}
export class DuracaoInvalidaError extends DomainError {
  constructor() { super("DURACAO_INVALIDA", "A duração do plano deve ser de pelo menos 1 mês."); }
}
export class TransicaoInvalidaError extends DomainError {
  constructor(msg: string) { super("TRANSICAO_INVALIDA", msg); }
}
