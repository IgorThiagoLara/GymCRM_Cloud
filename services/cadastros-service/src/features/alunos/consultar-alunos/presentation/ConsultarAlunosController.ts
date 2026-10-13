import { Request, Response } from "express";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { ListarAlunosUseCase, ObterAlunoUseCase } from "../application/ConsultarAlunosUseCases";

export class ConsultarAlunosController {
  constructor(private readonly listar: ListarAlunosUseCase, private readonly obter: ObterAlunoUseCase) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const r = await this.listar.execute(res.locals.ctx as TenantContext);
    res.json(r.value);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const r = await this.obter.execute(req.params.id, res.locals.ctx as TenantContext);
    if (!r.isSuccess) { res.status(404).json({ error: r.error.code, message: r.error.message }); return; }
    res.json(r.value);
  };
}
