import { fail, ok, Result } from "../../../shared/Result";
import { EmailMessage } from "../domain/EmailMessage";
import { IEmailProvider } from "./ports";

export interface EnviarEmailCommand { destinatario?: unknown; assunto?: unknown; corpo?: unknown; referencia?: unknown }

export class EnviarEmailUseCase {
  constructor(private readonly provider: IEmailProvider) {}

  async execute(cmd: EnviarEmailCommand): Promise<Result<{ referencia?: string }>> {
    const msg = EmailMessage.criar(cmd);
    if (!msg.ok) return fail(msg.code, msg.message);
    try {
      await this.provider.enviar(msg.value);
    } catch (err) {
      return fail("PROVEDOR_INDISPONIVEL", (err as Error).message);
    }
    return ok({ referencia: msg.value.referencia });
  }
}
