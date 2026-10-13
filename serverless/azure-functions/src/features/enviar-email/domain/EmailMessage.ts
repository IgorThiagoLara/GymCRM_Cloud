import { fail, ok, Result } from "../../../shared/Result";

export class EmailMessage {
  private constructor(
    public readonly destinatario: string,
    public readonly assunto: string,
    public readonly corpo: string,
    public readonly referencia?: string
  ) {}

  static criar(input: { destinatario?: unknown; assunto?: unknown; corpo?: unknown; referencia?: unknown }): Result<EmailMessage> {
    const { destinatario, assunto, corpo, referencia } = input;
    if (typeof destinatario !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario))
      return fail("DESTINATARIO_INVALIDO", "Informe um e-mail de destinatário válido.");
    if (typeof assunto !== "string" || assunto.trim().length === 0 || assunto.length > 200)
      return fail("ASSUNTO_INVALIDO", "Assunto obrigatório (até 200 caracteres).");
    if (typeof corpo !== "string" || corpo.trim().length === 0 || corpo.length > 10000)
      return fail("CORPO_INVALIDO", "Corpo obrigatório (até 10.000 caracteres).");
    return ok(new EmailMessage(destinatario.trim(), assunto.trim(), corpo, typeof referencia === "string" ? referencia : undefined));
  }
}
