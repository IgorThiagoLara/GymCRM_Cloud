import { GerarCobrancaUseCase } from "../src/features/financeiro/gerar-cobranca/application/GerarCobrancaUseCase";
import { MatriculaCriadaHandler } from "../src/features/financeiro/gerar-cobranca/application/MatriculaCriadaHandler";
import { InMemoryCobrancaRepository } from "../src/features/financeiro/gerar-cobranca/infrastructure/InMemoryCobrancaRepository";
import { DomainEvent } from "../src/shared/events/DomainEvent";
import { InMemoryEventBus } from "../src/shared/events/InMemoryEventBus";
import { TenantContext } from "../src/shared/kernel/TenantContext";

const ctx: TenantContext = { tenantId: "A", userId: "u1", perfil: "ADMIN" };

const viaBroker = <T extends DomainEvent>(e: T): T => JSON.parse(JSON.stringify(e));

describe("financeiro-service: reação ao evento MatriculaCriada", () => {
  it("gera cobrança PENDENTE e publica CobrancaGerada", async () => {
    const bus = new InMemoryEventBus();
    const repo = new InMemoryCobrancaRepository();
    const publicados: DomainEvent[] = [];
    bus.subscribe("CobrancaGerada", { handle: async (e) => { publicados.push(e); } });
    const handler = new MatriculaCriadaHandler(new GerarCobrancaUseCase(repo, bus));

    await handler.handle(viaBroker({
      name: "MatriculaCriada", occurredAt: new Date(), tenantId: "A",
      matriculaId: "m1", alunoEmail: "maria@x.com", valor: 99.9,
    } as any));

    const lista = await repo.findByMatricula("m1", ctx);
    expect(lista).toHaveLength(1);
    expect(lista[0].status).toBe("PENDENTE");
    expect(lista[0].valor).toBe(99.9);
    expect(publicados).toHaveLength(1);
  });

  it("não vaza cobranças entre tenants", async () => {
    const bus = new InMemoryEventBus();
    const repo = new InMemoryCobrancaRepository();
    const handler = new MatriculaCriadaHandler(new GerarCobrancaUseCase(repo, bus));
    await handler.handle({ name: "MatriculaCriada", occurredAt: new Date(), tenantId: "A", matriculaId: "m1", alunoEmail: "a@x.com", valor: 10 } as any);
    expect(await repo.findByMatricula("m1", { ...ctx, tenantId: "B" })).toHaveLength(0);
  });

  it("valor inválido faz o handler falhar (mensagem vai para a DLQ no broker real)", async () => {
    const handler = new MatriculaCriadaHandler(new GerarCobrancaUseCase(new InMemoryCobrancaRepository(), new InMemoryEventBus()));
    await expect(handler.handle({ name: "MatriculaCriada", occurredAt: new Date(), tenantId: "A", matriculaId: "m1", alunoEmail: "a@x.com", valor: 0 } as any))
      .rejects.toThrow();
  });
});
