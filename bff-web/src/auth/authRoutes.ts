import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { autenticar } from "./users";

const loginSchema = z.object({ email: z.string().email(), senha: z.string().min(1) });

export function authRoutes(jwtSecret: string): Router {
  const router = Router();
  router.post("/auth/login", (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "VALIDACAO" }); return; }
    const user = autenticar(parsed.data.email, parsed.data.senha);
    if (!user) { res.status(401).json({ error: "CREDENCIAIS_INVALIDAS" }); return; }
    const token = jwt.sign({ sub: user.id, tenantId: user.tenantId, perfil: user.perfil }, jwtSecret, { expiresIn: "8h" });
    res.json({ token, usuario: { id: user.id, nome: user.nome, perfil: user.perfil, tenantId: user.tenantId } });
  });
  return router;
}
