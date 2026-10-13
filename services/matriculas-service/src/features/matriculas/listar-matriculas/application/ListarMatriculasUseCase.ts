import { Result } from "../../../../shared/kernel/Result";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { MatriculaResumo } from "../domain/MatriculaResumo";
import { IMatriculaQuery } from "./ports";

export class ListarMatriculasUseCase {
  constructor(private readonly query: IMatriculaQuery) {}
  async execute(ctx: TenantContext, filtro?: { alunoId?: string }): Promise<Result<MatriculaResumo[]>> {
    return Result.ok(await this.query.listar(ctx, filtro));
  }
}
