import { Request, Response } from "express";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { ConsultarNotificacoesUseCase } from "../application/ConsultarNotificacoesUseCase";

export class ConsultarNotificacoesController {
  constructor(private readonly useCase: ConsultarNotificacoesUseCase) {}
  handle = async (req: Request, res: Response): Promise<void> => {
    const limite = Number(req.query.limite ?? 50);
    const r = await this.useCase.execute(res.locals.ctx as TenantContext, Number.isFinite(limite) ? limite : 50);
    res.json(r.value);
  };
}
