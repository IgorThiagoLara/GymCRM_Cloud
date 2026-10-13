import { Request, Response } from "express";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { ListarMatriculasUseCase } from "../application/ListarMatriculasUseCase";

export class ListarMatriculasController {
  constructor(private readonly useCase: ListarMatriculasUseCase) {}
  handle = async (req: Request, res: Response): Promise<void> => {
    const alunoId = typeof req.query.alunoId === "string" ? req.query.alunoId : undefined;
    const r = await this.useCase.execute(res.locals.ctx as TenantContext, { alunoId });
    res.json(r.value);
  };
}
