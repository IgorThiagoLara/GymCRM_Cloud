import { Router } from "express";
import { asyncHandler } from "../../../../shared/http/ErrorMiddleware";
import { rbac } from "../../../../shared/http/RbacMiddleware";
import { CriarMatriculaController } from "./CriarMatriculaController";

export function criarMatriculaRoutes(controller: CriarMatriculaController): Router {
  const router = Router();
  router.post("/matriculas", rbac("ADMIN", "RECEPCIONISTA"), asyncHandler(controller.handle));
  return router;
}
