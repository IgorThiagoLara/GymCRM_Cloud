import { NextFunction, Request, RequestHandler, Response } from "express";
import { UpstreamUnavailableError } from "./UpstreamError";

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (req, res, next) => { fn(req, res, next).catch(next); };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof UpstreamUnavailableError) {
    console.error(`[http] ${err.message}`);
    res.status(503).json({ error: "SERVICO_INDISPONIVEL", servico: err.service });
    return;
  }
  console.error("[http] erro não tratado:", err);
  res.status(500).json({ error: "ERRO_INTERNO" });
}
