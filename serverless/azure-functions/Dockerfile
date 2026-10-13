# Executa a MESMA função localmente (host do Azure Functions v4 em container) para integrar com o docker-compose.
# Uso: docker compose --profile azure-local up   (ver README da raiz). Em produção você publica no Azure (README desta pasta).
FROM mcr.microsoft.com/azure-functions/node:4-node20
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_WORKER_RUNTIME=node \
    FUNCTION_AUTH_LEVEL=anonymous
COPY . /home/site/wwwroot
RUN cd /home/site/wwwroot && npm install && npm run build
