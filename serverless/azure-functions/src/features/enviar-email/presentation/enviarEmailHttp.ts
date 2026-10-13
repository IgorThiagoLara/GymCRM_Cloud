import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { EnviarEmailUseCase } from "../application/EnviarEmailUseCase";

const STATUS: Record<string, number> = {
  DESTINATARIO_INVALIDO: 400,
  ASSUNTO_INVALIDO: 400,
  CORPO_INVALIDO: 400,
  PROVEDOR_INDISPONIVEL: 502,
};

export function criarEnviarEmailHandler(useCase: EnviarEmailUseCase) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const correlationId = request.headers.get("x-correlation-id") ?? undefined;
    const idempotencyKey = request.headers.get("x-idempotency-key") ?? undefined;

    let body: any;
    try { body = await request.json(); } catch { return { status: 400, jsonBody: { error: "JSON_INVALIDO" } }; }

    const result = await useCase.execute({ ...body, referencia: body?.referencia ?? idempotencyKey });
    if (!result.ok) {
      context.warn(`enviar-email falhou code=${result.code} correlationId=${correlationId} idempotencyKey=${idempotencyKey}`);
      return { status: STATUS[result.code] ?? 500, jsonBody: { error: result.code, message: result.message } };
    }
    context.log(`enviar-email ok correlationId=${correlationId} idempotencyKey=${idempotencyKey}`);
    return { status: 202, jsonBody: { status: "ENVIADO", referencia: result.value.referencia } };
  };
}
