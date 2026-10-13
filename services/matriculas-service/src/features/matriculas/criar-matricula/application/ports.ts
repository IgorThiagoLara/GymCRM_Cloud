import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { Matricula } from "../domain/Matricula";

export interface IMatriculaRepository {
  save(matricula: Matricula, ctx: TenantContext): Promise<void>;
  findById(id: string, ctx: TenantContext): Promise<Matricula | null>;
  findAtivaByAluno(alunoId: string, ctx: TenantContext): Promise<Matricula | null>;
}

export interface AlunoDTO { id: string; nome: string; email: string; }
export interface IAlunoReader {
  obter(alunoId: string, ctx: TenantContext): Promise<AlunoDTO | null>;
}

export interface PlanoDTO { id: string; nome: string; valor: number; duracaoMeses: number; }
export interface IPlanoReader {
  obter(planoId: string, ctx: TenantContext): Promise<PlanoDTO | null>;
}
