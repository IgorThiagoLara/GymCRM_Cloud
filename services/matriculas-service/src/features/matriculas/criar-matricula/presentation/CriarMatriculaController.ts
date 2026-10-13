import { Request, Response } from "express";
import { z } from "zod";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { CriarMatriculaUseCase } from "../application/CriarMatriculaUseCase";

const bodySchema = z.object({
  alunoId: z.string().min(1),
  turmaId: z.string().min(1),
  planoId: z.string().min(1),
});

const STATUS_POR_CODIGO: Record<string, number> = {
  ALUNO_NAO_ENCONTRADO: 404,
  PLANO_NAO_ENCONTRADO: 404,
  MATRICULA_DUPLICADA: 409,
};

export class CriarMatriculaController {
  constructor(private readonly useCase: CriarMatriculaUseCase) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDACAO", detalhes: parsed.error.flatten().fieldErrors });
      return;
    }
    const ctx = res.locals.ctx as TenantContext;
    const result = await this.useCase.execute(parsed.data, ctx);
    if (result.isSuccess) {
      res.status(201).json(result.value);
      return;
    }
    res.status(STATUS_POR_CODIGO[result.error.code] ?? 400).json({
      error: result.error.code,
      message: result.error.message,
    });
  };
}
