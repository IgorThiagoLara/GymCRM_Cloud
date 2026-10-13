import { Router } from "express";
import { asyncHandler } from "../../../../shared/http/ErrorMiddleware";
import { rbac } from "../../../../shared/http/RbacMiddleware";
import { ConsultarPlanosController } from "./ConsultarPlanosController";

export function consultarPlanosRoutes(c: ConsultarPlanosController): Router {
  const router = Router();
  router.get("/planos", rbac("ADMIN", "RECEPCIONISTA", "INSTRUTOR"), asyncHandler(c.list));
  router.get("/planos/:id", rbac("ADMIN", "RECEPCIONISTA", "INSTRUTOR"), asyncHandler(c.get));
  return router;
}
