import { Router } from "express";
import { asyncHandler } from "../../../../shared/http/ErrorMiddleware";
import { rbac } from "../../../../shared/http/RbacMiddleware";
import { ConsultarAlunosController } from "./ConsultarAlunosController";

export function consultarAlunosRoutes(c: ConsultarAlunosController): Router {
  const router = Router();
  router.get("/alunos", rbac("ADMIN", "RECEPCIONISTA", "INSTRUTOR"), asyncHandler(c.list));
  router.get("/alunos/:id", rbac("ADMIN", "RECEPCIONISTA", "INSTRUTOR"), asyncHandler(c.get));
  return router;
}
