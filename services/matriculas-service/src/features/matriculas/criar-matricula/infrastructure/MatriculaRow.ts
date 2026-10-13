import { Matricula } from "../domain/Matricula";
import { StatusMatricula } from "../domain/StatusMatricula";

export interface MatriculaRow {
  id: string; tenantId: string; alunoId: string; turmaId: string; planoId: string;
  dataInicio: Date; dataFim: Date; status: string;
}

export const toRow = (m: Matricula): MatriculaRow => ({
  id: m.id, tenantId: m.tenantId, alunoId: m.alunoId, turmaId: m.turmaId, planoId: m.planoId,
  dataInicio: m.dataInicio, dataFim: m.dataFim, status: m.status,
});

export const fromRow = (r: MatriculaRow): Matricula =>
  Matricula.reconstituir({ ...r, status: r.status as StatusMatricula });
