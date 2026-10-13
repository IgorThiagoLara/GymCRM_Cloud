import { Router } from "express";
import { asyncHandler } from "../../../../shared/http/ErrorMiddleware";
import { rbac } from "../../../../shared/http/RbacMiddleware";
import { ConsultarCobrancasController } from "./ConsultarCobrancasController";

export function consultarCobrancasRoutes(c: ConsultarCobrancasController): Router {
  const router = Router();
  router.get("/cobrancas", rbac("ADMIN", "RECEPCIONISTA"), asyncHandler(c.handle));
  return router;
}
