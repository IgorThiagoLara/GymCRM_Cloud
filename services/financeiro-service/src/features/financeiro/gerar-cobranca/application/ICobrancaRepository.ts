import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { Cobranca } from "../domain/Cobranca";

export interface ICobrancaRepository {
  save(cobranca: Cobranca, ctx: TenantContext): Promise<void>;
  findByMatricula(matriculaId: string, ctx: TenantContext): Promise<Cobranca[]>;
}
