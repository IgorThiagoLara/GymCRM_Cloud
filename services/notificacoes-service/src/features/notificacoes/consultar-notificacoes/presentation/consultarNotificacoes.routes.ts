import { Router } from "express";
import { asyncHandler } from "../../../../shared/http/ErrorMiddleware";
import { rbac } from "../../../../shared/http/RbacMiddleware";
import { ConsultarNotificacoesController } from "./ConsultarNotificacoesController";

export function consultarNotificacoesRoutes(c: ConsultarNotificacoesController): Router {
  const router = Router();
  router.get("/notificacoes", rbac("ADMIN", "RECEPCIONISTA"), asyncHandler(c.handle));
  return router;
}
