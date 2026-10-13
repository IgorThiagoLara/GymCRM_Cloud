import { Router } from "express";
import { asyncHandler } from "../../../../shared/http/ErrorMiddleware";
import { rbac } from "../../../../shared/http/RbacMiddleware";
import { ListarMatriculasController } from "./ListarMatriculasController";

export function listarMatriculasRoutes(controller: ListarMatriculasController): Router {
  const router = Router();
  router.get("/matriculas", rbac("ADMIN", "RECEPCIONISTA", "INSTRUTOR"), asyncHandler(controller.handle));
  return router;
}
