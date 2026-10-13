import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Perfil, TenantContext } from "../kernel/TenantContext";

export function authMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ error: "NAO_AUTENTICADO" });
      return;
    }
    try {
      const payload = jwt.verify(header.slice(7), secret) as jwt.JwtPayload;
      if (!payload.sub || !payload.tenantId || !payload.perfil) {
        res.status(401).json({ error: "TOKEN_INVALIDO" });
        return;
      }
      const ctx: TenantContext = {
        userId: String(payload.sub),
        tenantId: String(payload.tenantId),
        perfil: payload.perfil as Perfil,
      };
      res.locals.ctx = ctx;
      next();
    } catch {
      res.status(401).json({ error: "TOKEN_INVALIDO" });
    }
  };
}
