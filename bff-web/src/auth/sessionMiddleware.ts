import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Perfil, Session } from "../types";

export function sessionMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) { res.status(401).json({ error: "NAO_AUTENTICADO" }); return; }
    try {
      const token = h.slice(7);
      const p = jwt.verify(token, secret) as jwt.JwtPayload;
      if (!p.sub || !p.tenantId || !p.perfil) { res.status(401).json({ error: "TOKEN_INVALIDO" }); return; }
      const rid = req.headers["x-request-id"];
      const s: Session = { requestId: typeof rid === "string" ? rid : undefined, userId: String(p.sub), tenantId: String(p.tenantId), perfil: p.perfil as Perfil, token };
      res.locals.session = s;
      next();
    } catch {
      res.status(401).json({ error: "TOKEN_INVALIDO" });
    }
  };
}
