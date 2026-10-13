export interface CobrancaView {
  id: string; matriculaId: string; valor: number; vencimento: string; status: string;
  alunoNome: string | null; planoNome: string | null;
}
export interface CobrancasResponse {
  itens: CobrancaView[];
  totais: { pendente: number; paga: number; recusada: number };
  degradado: string[];
}
export interface NotificacaoView { id: string; destinatario: string; assunto: string; status: string; criadaEm: string }
