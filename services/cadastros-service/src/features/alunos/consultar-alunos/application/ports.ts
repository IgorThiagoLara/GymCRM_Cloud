import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { Aluno } from "../domain/Aluno";

export interface IAlunoRepository {
  listar(ctx: TenantContext): Promise<Aluno[]>;
  obter(id: string, ctx: TenantContext): Promise<Aluno | null>;
}

export interface AlunoOutput { id: string; nome: string; email: string; }
