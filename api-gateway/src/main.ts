import { configFromEnv } from "./config";
import { createGateway } from "./gateway";

if (require.main === module) {
  const port = Number(process.env.PORT ?? 8080);
  createGateway(configFromEnv()).listen(port, () => console.log(`api-gateway na porta ${port}`));
}
