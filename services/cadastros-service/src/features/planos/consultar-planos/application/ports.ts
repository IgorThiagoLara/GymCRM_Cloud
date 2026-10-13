import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { Plano } from "../domain/Plano";

export interface IPlanoRepository {
  listar(ctx: TenantContext): Promise<Plano[]>;
  obter(id: string, ctx: TenantContext): Promise<Plano | null>;
}

export interface PlanoOutput { id: string; nome: string; valor: number; duracaoMeses: number; }
