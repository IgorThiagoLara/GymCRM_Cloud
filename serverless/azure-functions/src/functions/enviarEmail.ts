import { app } from "@azure/functions";
import { montarEnviarEmailHandler } from "../composition";

app.http("enviarEmail", {
  methods: ["POST"],
  route: "enviar-email",
  authLevel: (process.env.FUNCTION_AUTH_LEVEL ?? "function") as "anonymous" | "function",
  handler: montarEnviarEmailHandler(),
});

app.http("health", {
  methods: ["GET"],
  route: "health",
  authLevel: "anonymous",
  handler: async () => ({ status: 200, jsonBody: { status: "ok", service: "gymcrm-azure-functions" } }),
});
