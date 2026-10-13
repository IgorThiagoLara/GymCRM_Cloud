import { Cobranca, StatusCobranca } from "../domain/Cobranca";

export interface CobrancaRow {
  id: string; tenantId: string; matriculaId: string; valor: number; vencimento: Date; status: string;
}
export const toRow = (c: Cobranca): CobrancaRow => ({
  id: c.id, tenantId: c.tenantId, matriculaId: c.matriculaId, valor: c.valor, vencimento: c.vencimento, status: c.status,
});
export const fromRow = (r: CobrancaRow): Cobranca => Cobranca.reconstituir({ ...r, status: r.status as StatusCobranca });
