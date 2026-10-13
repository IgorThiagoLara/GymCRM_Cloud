import { NextFunction, Request, Response } from "express";
import { Perfil, TenantContext } from "../kernel/TenantContext";

export function rbac(...perfis: Perfil[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const ctx = res.locals.ctx as TenantContext | undefined;
    if (!ctx || !perfis.includes(ctx.perfil)) {
      res.status(403).json({ error: "ACESSO_NEGADO" });
      return;
    }
    next();
  };
}
