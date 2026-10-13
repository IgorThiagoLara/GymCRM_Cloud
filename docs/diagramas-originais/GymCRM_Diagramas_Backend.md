# GymCRM - Diagramas do Backend (Vertical Slice + Clean Architecture + SOLID)

## Componentes - Visão por Vertical Slices

```mermaid
flowchart TB
  CLIENT["Web App React / Totem"]:::ext
  subgraph API["API Backend - Node.js + TypeScript"]
    direction TB
    ROUTER["Presentation compartilhada<br/>Router + AuthMiddleware + TenantMiddleware + RbacMiddleware"]
    subgraph SLICES["features/ - Vertical Slices (1 por componente de negocio)"]
      direction TB
      subgraph G1["Acesso e Cadastros"]
        direction LR
        AUTH["auth<br/>login, logout,<br/>recuperar-senha"]
        TEN["tenants<br/>cadastrar-academia,<br/>gerir-usuarios"]
        ALU["alunos<br/>cadastrar, editar,<br/>consultar, excluir"]
        FUN["funcionarios<br/>cadastrar,<br/>alocar-instrutor"]
      end
      subgraph G2["Operacao da Academia"]
        direction LR
        MAT["matriculas<br/>criar, renovar,<br/>cancelar, trancar"]
        TUR["turmas<br/>cadastrar-turma,<br/>horarios"]
        AGE["agenda<br/>check-in,<br/>frequencia"]
        EST["estoque<br/>movimentar,<br/>alerta-minimo"]
      end
      subgraph G3["Financeiro, Comunicacao e Gestao"]
        direction LR
        FIN["financeiro<br/>gerar-cobranca,<br/>processar-pagamento,<br/>lancar-despesa"]
        NOT["notificacoes<br/>enviar-email"]
        REL["relatorios<br/>financeiro,<br/>operacional"]
        DASH["dashboard<br/>indicadores"]
      end
    end
    subgraph SHARED["shared/ - Shared Kernel"]
      direction LR
      KERNEL["kernel<br/>Entity, Result,<br/>TenantContext"]
      EVBUS["events<br/>IEventPublisher,<br/>InMemoryEventBus"]
      INFRA["infrastructure<br/>PrismaClient, JobScheduler,<br/>Logger, Config"]
    end
  end
  DB[("PostgreSQL<br/>shared schema + tenant_id")]:::ext
  GW["Gateway de Pagamento<br/>Stripe / PagSeguro"]:::ext
  MAIL["Servico de E-mail"]:::ext

  CLIENT -->|"HTTPS REST/JSON"| ROUTER
  ROUTER --> G1
  ROUTER --> G2
  ROUTER --> G3
  MAT -. "MatriculaCriada" .-> FIN
  EST -. "EstoqueMinimoAtingido" .-> NOT
  FIN -. "PagamentoRecusado" .-> NOT
  SLICES --> SHARED
  INFRA -->|"SQL"| DB
  FIN -->|"PaymentGatewayAdapter"| GW
  NOT -->|"EmailAdapter"| MAIL
  classDef ext fill:#eee,stroke:#666,color:#222;
```

## Componentes - Anatomia de um Slice (Clean Architecture)

```mermaid
flowchart TB
  subgraph SLICE["Slice: features/matriculas/criar-matricula"]
    direction TB
    subgraph L4["1. Presentation / Interface Adapters"]
      direction LR
      ROUTE["criarMatricula.routes.ts"] --> CTRL["CriarMatriculaController"]
      CTRL --> DTO["CriarMatriculaRequestDTO<br/>(validacao Zod)"]
    end
    subgraph L3["2. Application (Use Cases)"]
      direction LR
      UC["CriarMatriculaUseCase"]
      CMD["CriarMatriculaCommand"]
      PORTS["Ports (interfaces)<br/>IMatriculaRepository, IAlunoReader,<br/>IPlanoReader, IEventPublisher"]
    end
    subgraph L2["3. Domain"]
      direction LR
      ENT["Matricula (Entity)"]
      VO["StatusMatricula, Periodo<br/>(Value Objects)"]
      EV["MatriculaCriadaEvent"]
      ERR["MatriculaDuplicadaError"]
    end
    subgraph L1["4. Infrastructure"]
      direction LR
      REPO["PrismaMatriculaRepository"]
      READ["AlunoReaderPrisma,<br/>PlanoReaderPrisma"]
      BUS["InMemoryEventBus"]
    end
  end
  KERNEL["shared/kernel: TenantContext, Result, Entity"]
  DBX[("PostgreSQL<br/>WHERE tenant_id")]

  CTRL -->|"chama"| UC
  UC --> CMD
  UC -->|"orquestra"| ENT
  UC -->|"depende de"| PORTS
  ENT --> VO
  ENT --> EV
  ENT --> ERR
  REPO -. "implementa" .-> PORTS
  READ -. "implementa" .-> PORTS
  BUS -. "implementa" .-> PORTS
  REPO -->|"SQL"| DBX
  SLICE --> KERNEL
```

## Classes - Shared Kernel, Matrículas, Financeiro e Notificações

```mermaid
classDiagram
direction LR

namespace SharedKernel {
  class TenantContext {
    <<value object>>
    +tenantId: string
    +userId: string
    +perfil: Perfil
  }
  class Entity {
    <<abstract>>
    +id: string
    +tenantId: string
  }
  class Result~T~ {
    +isSuccess: boolean
    +value: T
    +error: DomainError
    +ok(value) Result
    +fail(error) Result
  }
  class DomainEvent {
    <<interface>>
    +occurredAt: Date
    +tenantId: string
  }
  class IEventPublisher {
    <<interface>>
    +publish(event: DomainEvent) Promise~void~
  }
  class IEventHandler~E~ {
    <<interface>>
    +handle(event: E) Promise~void~
  }
}

namespace Matriculas_Slice {
  class CriarMatriculaController {
    -useCase: CriarMatriculaUseCase
    +handle(req, res) Promise~void~
  }
  class CriarMatriculaUseCase {
    -matriculas: IMatriculaRepository
    -alunos: IAlunoReader
    -planos: IPlanoReader
    -events: IEventPublisher
    +execute(cmd, ctx: TenantContext) Promise~Result~
  }
  class CriarMatriculaCommand {
    +alunoId: string
    +turmaId: string
    +planoId: string
  }
  class Matricula {
    +alunoId: string
    +planoId: string
    +status: StatusMatricula
    +dataInicio: Date
    +dataFim: Date
    +criar(props)$ Matricula
    +cancelar(motivo) void
    +renovar(periodo) void
    +trancar() void
  }
  class StatusMatricula {
    <<enumeration>>
    ATIVA
    TRANCADA
    CANCELADA
    INADIMPLENTE
  }
  class MatriculaCriadaEvent {
    +matriculaId: string
    +planoId: string
    +valor: number
  }
  class IMatriculaRepository {
    <<interface>>
    +save(m: Matricula, ctx) Promise~void~
    +findById(id, ctx) Promise~Matricula~
  }
  class IAlunoReader {
    <<interface>>
    +existe(alunoId, ctx) Promise~boolean~
  }
  class IPlanoReader {
    <<interface>>
    +obter(planoId, ctx) Promise~PlanoDTO~
  }
  class PrismaMatriculaRepository {
    -prisma: PrismaClient
    +save(m, ctx) Promise~void~
    +findById(id, ctx) Promise~Matricula~
  }
}

namespace Financeiro_Slice {
  class MatriculaCriadaHandler {
    -useCase: GerarCobrancaUseCase
    +handle(e: MatriculaCriadaEvent) Promise~void~
  }
  class GerarCobrancaUseCase {
    -cobrancas: ICobrancaRepository
    -gateway: IPaymentGateway
    -events: IEventPublisher
    +execute(cmd, ctx) Promise~Result~
  }
  class Cobranca {
    +matriculaId: string
    +valor: number
    +vencimento: Date
    +status: StatusCobranca
    +gerar(props)$ Cobranca
    +registrarPagamento() void
    +marcarRecusada() void
  }
  class ICobrancaRepository {
    <<interface>>
    +save(c: Cobranca, ctx) Promise~void~
    +buscarVencendo(ate: Date, ctx) Promise~Cobranca[]~
  }
  class IPaymentGateway {
    <<interface>>
    +cobrar(c: Cobranca) Promise~PagamentoResult~
    +estornar(txId: string) Promise~void~
  }
  class StripePaymentGateway {
    -client: StripeClient
    +cobrar(c) Promise~PagamentoResult~
    +estornar(txId) Promise~void~
  }
  class PrismaCobrancaRepository {
    +save(c, ctx) Promise~void~
    +buscarVencendo(ate, ctx) Promise~Cobranca[]~
  }
}

namespace Notificacoes_Slice {
  class EnviarNotificacaoUseCase {
    -sender: INotificationSender
    +execute(cmd) Promise~Result~
  }
  class INotificationSender {
    <<interface>>
    +enviar(msg: Mensagem) Promise~void~
  }
  class EmailNotificationAdapter {
    -http: HttpClient
    -retry: RetryPolicy
    +enviar(msg) Promise~void~
  }
}

CriarMatriculaController --> CriarMatriculaUseCase
CriarMatriculaUseCase ..> CriarMatriculaCommand
CriarMatriculaUseCase --> IMatriculaRepository
CriarMatriculaUseCase --> IAlunoReader
CriarMatriculaUseCase --> IPlanoReader
CriarMatriculaUseCase --> IEventPublisher
CriarMatriculaUseCase ..> TenantContext
CriarMatriculaUseCase ..> Matricula : cria
Matricula --|> Entity
Matricula --> StatusMatricula
Matricula ..> MatriculaCriadaEvent : gera
MatriculaCriadaEvent ..|> DomainEvent
PrismaMatriculaRepository ..|> IMatriculaRepository

MatriculaCriadaHandler ..|> IEventHandler
MatriculaCriadaHandler --> GerarCobrancaUseCase
GerarCobrancaUseCase --> ICobrancaRepository
GerarCobrancaUseCase --> IPaymentGateway
GerarCobrancaUseCase ..> Cobranca : cria
Cobranca --|> Entity
PrismaCobrancaRepository ..|> ICobrancaRepository
StripePaymentGateway ..|> IPaymentGateway

EnviarNotificacaoUseCase --> INotificationSender
EmailNotificationAdapter ..|> INotificationSender
```

