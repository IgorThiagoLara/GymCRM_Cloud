export interface NotificacaoRow {
  id: string; tenantId: string; destinatario: string; assunto: string; corpo: string;
  status: string; erro: string | null; criadaEm: Date;
}
