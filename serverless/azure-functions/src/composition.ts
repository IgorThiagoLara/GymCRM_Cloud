import { EnviarEmailUseCase } from "./features/enviar-email/application/EnviarEmailUseCase";
import { IEmailProvider } from "./features/enviar-email/application/ports";
import { AcsEmailProvider } from "./features/enviar-email/infrastructure/AcsEmailProvider";
import { ConsoleEmailProvider } from "./features/enviar-email/infrastructure/ConsoleEmailProvider";
import { criarEnviarEmailHandler } from "./features/enviar-email/presentation/enviarEmailHttp";

export function escolherProvider(env: NodeJS.ProcessEnv = process.env): IEmailProvider {
  if ((env.EMAIL_PROVIDER ?? "console") === "acs") {
    if (!env.ACS_CONNECTION_STRING || !env.ACS_SENDER_ADDRESS)
      throw new Error("EMAIL_PROVIDER=acs exige ACS_CONNECTION_STRING e ACS_SENDER_ADDRESS");
    return new AcsEmailProvider(env.ACS_CONNECTION_STRING, env.ACS_SENDER_ADDRESS);
  }
  return new ConsoleEmailProvider();
}

export function montarEnviarEmailHandler(env: NodeJS.ProcessEnv = process.env) {
  return criarEnviarEmailHandler(new EnviarEmailUseCase(escolherProvider(env)));
}
