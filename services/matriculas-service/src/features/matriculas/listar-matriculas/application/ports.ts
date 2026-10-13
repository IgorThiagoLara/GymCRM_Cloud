import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { MatriculaResumo } from "../domain/MatriculaResumo";

export interface IMatriculaQuery {
  listar(ctx: TenantContext, filtro?: { alunoId?: string }): Promise<MatriculaResumo[]>;
}
