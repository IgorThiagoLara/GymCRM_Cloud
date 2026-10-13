import { Request, Response, Router } from "express";
import { IEventLogQuery } from "../events/IEventLog";
import { TenantContext } from "../kernel/TenantContext";
import { asyncHandler } from "./ErrorMiddleware";
import { rbac } from "./RbacMiddleware";

export function eventLogRoutes(query: IEventLogQuery, servico: string): Router {
  const router = Router();
  router.get("/eventos", rbac("ADMIN", "RECEPCIONISTA"), asyncHandler(async (req: Request, res: Response) => {
    const pedido = Number(req.query.limite ?? 100);
    const limite = Number.isFinite(pedido) ? Math.min(Math.max(pedido, 1), 500) : 100;
    const itens = await query.listar(res.locals.ctx as TenantContext, limite);
    res.json(itens.map((i) => ({ ...i, servico })));
  }));
  return router;
}
