import { EnviarEmailUseCase } from "../src/features/enviar-email/application/EnviarEmailUseCase";
import { IEmailProvider } from "../src/features/enviar-email/application/ports";
import { EmailMessage } from "../src/features/enviar-email/domain/EmailMessage";
import { criarEnviarEmailHandler } from "../src/features/enviar-email/presentation/enviarEmailHttp";
import { escolherProvider } from "../src/composition";
import { ConsoleEmailProvider } from "../src/features/enviar-email/infrastructure/ConsoleEmailProvider";

const valido = { destinatario: "maria@x.com", assunto: "Nova mensalidade", corpo: "Vence em 10/11." };

function fakeProvider() {
  const enviados: EmailMessage[] = [];
  let quebrado = false;
  const provider: IEmailProvider = {
    enviar: async (m) => { if (quebrado) throw new Error("ACS fora do ar"); enviados.push(m); },
  };
  return { provider, enviados, quebrar: () => { quebrado = true; } };
}
const req = (body: unknown, headers: Record<string, string> = {}) =>
  ({ json: async () => { if (body === undefined) throw new Error("bad json"); return body; }, headers: { get: (k: string) => headers[k] ?? null } }) as any;
const ctx = { log: () => {}, warn: () => {} } as any;

describe("enviar-email (domínio + caso de uso)", () => {
  it("valida destinatário, assunto e corpo", () => {
    expect(EmailMessage.criar({ ...valido, destinatario: "invalido" }).ok).toBe(false);
    expect(EmailMessage.criar({ ...valido, assunto: "  " }).ok).toBe(false);
    expect(EmailMessage.criar({ ...valido, corpo: undefined }).ok).toBe(false);
    expect(EmailMessage.criar(valido).ok).toBe(true);
  });

  it("envia pelo provedor e devolve a referência", async () => {
    const { provider, enviados } = fakeProvider();
    const r = await new EnviarEmailUseCase(provider).execute({ ...valido, referencia: "evt-1" });
    expect(r.ok).toBe(true);
    expect(enviados).toHaveLength(1);
  });

  it("falha do provedor vira PROVEDOR_INDISPONIVEL", async () => {
    const f = fakeProvider(); f.quebrar();
    const r = await new EnviarEmailUseCase(f.provider).execute(valido);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("PROVEDOR_INDISPONIVEL");
  });
});

describe("enviar-email (trigger HTTP)", () => {
  it("202 em caso de sucesso, usando x-idempotency-key como referência", async () => {
    const { provider, enviados } = fakeProvider();
    const h = criarEnviarEmailHandler(new EnviarEmailUseCase(provider));
    const res = await h(req(valido, { "x-idempotency-key": "evt-9" }), ctx);
    expect(res.status).toBe(202);
    expect((res.jsonBody as any).referencia).toBe("evt-9");
    expect(enviados[0].referencia).toBe("evt-9");
  });

  it("400 para JSON inválido e para dados inválidos", async () => {
    const h = criarEnviarEmailHandler(new EnviarEmailUseCase(fakeProvider().provider));
    expect((await h(req(undefined), ctx)).status).toBe(400);
    expect((await h(req({ ...valido, destinatario: "x" }), ctx)).status).toBe(400);
  });

  it("502 quando o provedor falha (o notificacoes-service fará retry/DLQ)", async () => {
    const f = fakeProvider(); f.quebrar();
    const res = await criarEnviarEmailHandler(new EnviarEmailUseCase(f.provider))(req(valido), ctx);
    expect(res.status).toBe(502);
  });

  it("composição: padrão = console; acs sem credenciais falha cedo", () => {
    expect(escolherProvider({}) instanceof ConsoleEmailProvider).toBe(true);
    let erro = "";
    try { escolherProvider({ EMAIL_PROVIDER: "acs" } as any); } catch (e) { erro = (e as Error).message; }
    expect(erro).toContain("ACS_CONNECTION_STRING");
  });
});
