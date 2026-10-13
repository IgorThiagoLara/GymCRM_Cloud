import { Request, Response } from "express";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { ConsultarCobrancasUseCase } from "../application/ConsultarCobrancasUseCase";

export class ConsultarCobrancasController {
  constructor(private readonly useCase: ConsultarCobrancasUseCase) {}
  handle = async (req: Request, res: Response): Promise<void> => {
    const matriculaId = typeof req.query.matriculaId === "string" ? req.query.matriculaId : undefined;
    const r = await this.useCase.execute(res.locals.ctx as TenantContext, { matriculaId });
    res.json(r.value);
  };
}
