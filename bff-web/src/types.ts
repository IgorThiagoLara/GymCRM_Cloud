export type Perfil = "ADMIN" | "RECEPCIONISTA" | "INSTRUTOR" | "ALUNO";

export interface Session {
  requestId?: string;
  userId: string;
  tenantId: string;
  perfil: Perfil;
  token: string;
}

export interface AlunoDTO { id: string; nome: string; email: string }
export interface PlanoDTO { id: string; nome: string; valor: number; duracaoMeses: number }
export interface MatriculaDTO { id: string; alunoId: string; turmaId: string; planoId: string; status: string; dataInicio: string; dataFim: string }
export interface CobrancaDTO { id: string; matriculaId: string; valor: number; vencimento: string; status: string }
export interface NotificacaoDTO { id: string; destinatario: string; assunto: string; status: string; criadaEm: string }

export interface EventoDTO {
  eventId: string; correlationId: string; name: string; tenantId: string; servico: string;
  direcao: "PUBLICACAO" | "CONSUMO"; status: string; tentativas: number; erro: string | null; em: string;
}

export interface RawResponse<T = unknown> { status: number; body: T }

export interface ICadastrosClient {
  alunos(s: Session): Promise<AlunoDTO[]>;
  planos(s: Session): Promise<PlanoDTO[]>;
}
export interface IMatriculasClient {
  listar(s: Session): Promise<MatriculaDTO[]>;
  criar(s: Session, body: unknown): Promise<RawResponse>;
  eventos(s: Session): Promise<EventoDTO[]>;
}
export interface IFinanceiroClient {
  cobrancas(s: Session): Promise<CobrancaDTO[]>;
  eventos(s: Session): Promise<EventoDTO[]>;
}
export interface INotificacoesClient {
  listar(s: Session): Promise<NotificacaoDTO[]>;
  eventos(s: Session): Promise<EventoDTO[]>;
}
export interface Downstream {
  cadastros: ICadastrosClient;
  matriculas: IMatriculasClient;
  financeiro: IFinanceiroClient;
  notificacoes: INotificacoesClient;
}
