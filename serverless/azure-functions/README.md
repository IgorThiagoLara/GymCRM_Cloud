# GymCRM — Serverless com Azure Functions

Esta pasta contém a **função serverless** do sistema: `enviarEmail` (HTTP trigger, Node 20, modelo de programação v4).
Ela é o **ponto de integração serverless** do GymCRM:

```
financeiro-service ──CobrancaGerada──► RabbitMQ ──► notificacoes-service ──HTTPS POST──► Azure Function "enviarEmail" ──► e-mail
                                                       (AzureFunctionEmailSender)          (esta pasta)              (console ou Azure Communication Services)
```

O `notificacoes-service` continua sendo o dono do **histórico** e da **idempotência/retry** (EDA); a função só faz o envio, sem estado.
Se a função responder diferente de 2xx (ou estiver fora do ar), o `notificacoes-service` registra `FALHA` e o RabbitMQ refaz a tentativa com backoff (2 s, 5 s, 15 s) e, esgotadas, envia à DLQ.

A estrutura segue o mesmo padrão do resto do projeto (Clean Architecture + Vertical Slice):

```
src/
├── composition.ts                       # escolhe o provedor de e-mail por App Settings
├── functions/enviarEmail.ts             # registro dos triggers (app.http) — a única parte que conhece o runtime do Azure
└── features/enviar-email/
    ├── domain/EmailMessage.ts           # validação (regras)
    ├── application/                     # EnviarEmailUseCase + port IEmailProvider
    ├── infrastructure/                  # ConsoleEmailProvider, AcsEmailProvider (Azure Communication Services)
    └── presentation/enviarEmailHttp.ts  # HTTP <-> caso de uso (202 / 400 / 502)
```

## 1. Rodar localmente

Pré-requisitos: Node 20, [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local), (opcional) Azurite.

```bash
cd serverless/azure-functions
cp local.settings.json.example local.settings.json
npm install
npm test                 # testes do slice (sem precisar do Azure)
npm start                # build + func start  ->  http://localhost:7071

curl -X POST http://localhost:7071/api/enviar-email \
  -H "Content-Type: application/json" \
  -d '{"destinatario":"maria@exemplo.com","assunto":"Teste","corpo":"Olá!","referencia":"evt-1"}'
# -> 202 {"status":"ENVIADO","referencia":"evt-1"}   (o e-mail aparece no log da função: EMAIL_PROVIDER=console)
```

Conectar o GymCRM a essa função local (notificacoes-service rodando fora do Docker):

```bash
AZURE_FUNCTION_EMAIL_URL=http://localhost:7071/api/enviar-email npm run dev -w services/notificacoes-service
```

Ou tudo no Docker Compose, com a função em container (perfil `azure-local`), a partir da raiz do projeto:

```bash
AZURE_FUNCTION_EMAIL_URL=http://email-function/api/enviar-email docker compose --profile azure-local up --build
```

## 2. Publicar no Azure (passo a passo)

Pré-requisitos: [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) logado (`az login`) e Core Tools v4. Troque os nomes entre `<>` (o nome do Function App precisa ser único no Azure).

```bash
# 2.1 Recursos base
az group create --name rg-gymcrm --location brazilsouth
az storage account create --name <stgymcrm> --resource-group rg-gymcrm --location brazilsouth --sku Standard_LRS

# 2.2 Function App (Linux, Node 20, plano de Consumo = serverless de verdade: paga por execução)
az functionapp create --resource-group rg-gymcrm --name <func-gymcrm-email> \
  --storage-account <stgymcrm> --consumption-plan-location brazilsouth \
  --runtime node --runtime-version 20 --functions-version 4 --os-type linux

# 2.3 Publicar o código desta pasta (faz o build e o deploy)
cd serverless/azure-functions
npm install && npm run build
func azure functionapp publish <func-gymcrm-email>
```

> Se a assinatura não permitir o plano de Consumo na região, use o plano **Flex Consumption** (também serverless) pelo portal ou `az functionapp create --flexconsumption-location ...`. O código não muda.

### 2.4 Obter a URL e a chave da função

```bash
# URL base:  https://<func-gymcrm-email>.azurewebsites.net
az functionapp function keys list --resource-group rg-gymcrm --name <func-gymcrm-email> --function-name enviarEmail
# (ou no portal: Function App > Functions > enviarEmail > Function Keys)
```

Teste a função publicada:

```bash
curl -X POST "https://<func-gymcrm-email>.azurewebsites.net/api/enviar-email" \
  -H "Content-Type: application/json" -H "x-functions-key: <CHAVE>" \
  -d '{"destinatario":"maria@exemplo.com","assunto":"Teste","corpo":"Olá!"}'
```

Ver o log: portal > Function App > *Log stream*, ou `func azure functionapp logstream <func-gymcrm-email>`.

### 2.5 Conectar o GymCRM à função

Defina estas variáveis no **notificacoes-service** (no `docker-compose.yml`, em um `.env` ao lado dele, ou no ambiente do seu deploy):

```bash
AZURE_FUNCTION_EMAIL_URL=https://<func-gymcrm-email>.azurewebsites.net/api/enviar-email
AZURE_FUNCTION_KEY=<CHAVE>
```

Pronto: ao criar uma matrícula, o fluxo `MatriculaCriada → CobrancaGerada → notificacoes-service → Azure Function` roda de ponta a ponta, e você acompanha cada etapa no **Monitor de eventos** da tela.
Para provar o retry, suba o notificacoes-service com `EMAIL_FALHAS_SIMULADAS=2`: as 2 primeiras chamadas falham e a 3ª passa, com backoff visível.

### 2.6 (Opcional) Envio de e-mail real com Azure Communication Services

1. No portal: crie um recurso **Communication Services** e um **Email Communication Services**, adicione um domínio (o domínio gratuito `*.azurecomm.net` serve) e conecte o domínio ao recurso de Communication Services.
2. Copie a *connection string* do Communication Services e o endereço remetente (`DoNotReply@<guid>.azurecomm.net`).
3. Configure a função:

```bash
az functionapp config appsettings set --resource-group rg-gymcrm --name <func-gymcrm-email> --settings \
  EMAIL_PROVIDER=acs \
  ACS_CONNECTION_STRING="<connection-string>" \
  ACS_SENDER_ADDRESS="DoNotReply@<guid>.azurecomm.net"
```

## 3. Variáveis (App Settings)

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `EMAIL_PROVIDER` | `console` | `console` só registra no log; `acs` envia pelo Azure Communication Services |
| `ACS_CONNECTION_STRING`, `ACS_SENDER_ADDRESS` | — | Obrigatórias quando `EMAIL_PROVIDER=acs` |
| `FUNCTION_AUTH_LEVEL` | `function` | `function` exige a function key; `anonymous` só para desenvolvimento local |

## 4. Contrato HTTP

| | |
| --- | --- |
| Requisição | `POST /api/enviar-email` · headers `x-functions-key`, `x-correlation-id`, `x-idempotency-key` · corpo `{ destinatario, assunto, corpo, referencia? }` |
| `202` | `{ "status": "ENVIADO", "referencia": "..." }` |
| `400` | dados inválidos (`DESTINATARIO_INVALIDO`, `ASSUNTO_INVALIDO`, `CORPO_INVALIDO`, `JSON_INVALIDO`) |
| `502` | provedor de e-mail indisponível (o chamador faz retry) |

## 5. Outros usos de serverless que cabem no projeto

- **Trigger de fila**: trocar o HTTP por um *Service Bus trigger* (`app.serviceBusQueue`) e fazer o `notificacoes-service` publicar no Service Bus em vez de chamar a função por HTTP. O caso de uso `EnviarEmailUseCase` não muda.
- **Timer trigger** (`app.timer`) para jobs agendados, como marcar cobranças vencidas como inadimplentes.
