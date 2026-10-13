import { NextFunction, Request, RequestHandler, Response, Router } from "express";
import { z } from "zod";
import { UpstreamError } from "../clients/HttpJson";
import { montarCobrancas } from "../views/cobrancasView";
import { montarEventos } from "../views/eventosView";
import { montarMatriculas } from "../views/matriculasView";
import { Downstream, Perfil, Session } from "../types";

const handler = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };

const exigir = (...perfis: Perfil[]): RequestHandler => (_req, res, next) => {
  const s = res.locals.session as Session;
  if (!perfis.includes(s.perfil)) { res.status(403).json({ error: "ACESSO_NEGADO" }); return; }
  next();
};

const criarMatriculaSchema = z.object({ alunoId: z.string().min(1), turmaId: z.string().min(1), planoId: z.string().min(1) });
const staff = exigir("ADMIN", "RECEPCIONISTA");

export function apiRoutes(d: Downstream): Router {
  const r = Router();
  const sess = (res: Response) => res.locals.session as Session;

  r.get("/api/me", (_req, res) => {
    const { token: _t, ...me } = sess(res);
    res.json(me);
  });

  r.get("/api/matriculas/opcoes", staff, handler(async (_req, res) => {
    const [alunos, planos] = await Promise.all([d.cadastros.alunos(sess(res)), d.cadastros.planos(sess(res))]);
    res.json({ alunos, planos });
  }));

  r.get("/api/matriculas", staff, handler(async (_req, res) => {
    res.json(await montarMatriculas(d, sess(res)));
  }));

  r.post("/api/matriculas", staff, handler(async (req, res) => {
    const parsed = criarMatriculaSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "VALIDACAO", detalhes: parsed.error.flatten().fieldErrors }); return; }
    const out = await d.matriculas.criar(sess(res), parsed.data);
    res.status(out.status).json(out.body);
  }));

  r.get("/api/cobrancas", staff, handler(async (_req, res) => {
    res.json(await montarCobrancas(d, sess(res)));
  }));

  r.get("/api/notificacoes", staff, handler(async (_req, res) => {
    res.json(await d.notificacoes.listar(sess(res)));
  }));

  r.get("/api/eventos", staff, handler(async (_req, res) => {
    res.json(await montarEventos(d, sess(res)));
  }));

  r.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof UpstreamError) {
      console.error(`[bff] ${err.message}`);
      res.status(502).json({ error: "SERVICO_INDISPONIVEL", servico: err.service });
      return;
    }
    console.error("[bff] erro não tratado:", err);
    res.status(500).json({ error: "ERRO_INTERNO" });
  });
  return r;
}
