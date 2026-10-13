import { CriarMatriculaUseCase } from "../src/features/matriculas/criar-matricula/application/CriarMatriculaUseCase";
import { InMemoryMatriculaRepository } from "../src/features/matriculas/criar-matricula/infrastructure/InMemoryMatriculaRepository";
import { InMemoryAlunoReader, InMemoryPlanoReader } from "../src/features/matriculas/criar-matricula/infrastructure/InMemoryReaders";
import { DomainEvent } from "../src/shared/events/DomainEvent";
import { InMemoryEventBus } from "../src/shared/events/InMemoryEventBus";
import { TenantContext } from "../src/shared/kernel/TenantContext";

const ctxA: TenantContext = { tenantId: "A", userId: "u1", perfil: "RECEPCIONISTA" };
const ctxB: TenantContext = { tenantId: "B", userId: "u2", perfil: "RECEPCIONISTA" };

function setup() {
  const bus = new InMemoryEventBus();
  const publicados: DomainEvent[] = [];
  bus.subscribe("MatriculaCriada", { handle: async (e) => { publicados.push(e); } });
  const repo = new InMemoryMatriculaRepository();
  const useCase = new CriarMatriculaUseCase(
    repo,
    new InMemoryAlunoReader([{ tenantId: "A", id: "al1", nome: "Ana", email: "ana@x.com" }]),
    new InMemoryPlanoReader([{ tenantId: "A", id: "pl1", nome: "Mensal", valor: 100, duracaoMeses: 1 }]),
    bus
  );
  return { useCase, repo, publicados };
}

describe("CriarMatriculaUseCase", () => {
  it("cria a matrícula e publica MatriculaCriada", async () => {
    const { useCase, repo, publicados } = setup();
    const r = await useCase.execute({ alunoId: "al1", turmaId: "t1", planoId: "pl1" }, ctxA);
    expect(r.isSuccess).toBe(true);
    expect(await repo.findById(r.value.matriculaId, ctxA)).not.toBeNull();
    expect(publicados).toHaveLength(1);
    expect(publicados[0].tenantId).toBe("A");
  });

  it("rejeita aluno inexistente", async () => {
    const { useCase, publicados } = setup();
    const r = await useCase.execute({ alunoId: "nao-existe", turmaId: "t1", planoId: "pl1" }, ctxA);
    expect(r.error.code).toBe("ALUNO_NAO_ENCONTRADO");
    expect(publicados).toHaveLength(0);
  });

  it("rejeita plano inexistente", async () => {
    const { useCase } = setup();
    const r = await useCase.execute({ alunoId: "al1", turmaId: "t1", planoId: "x" }, ctxA);
    expect(r.error.code).toBe("PLANO_NAO_ENCONTRADO");
  });

  it("rejeita matrícula ativa duplicada", async () => {
    const { useCase } = setup();
    await useCase.execute({ alunoId: "al1", turmaId: "t1", planoId: "pl1" }, ctxA);
    const r = await useCase.execute({ alunoId: "al1", turmaId: "t1", planoId: "pl1" }, ctxA);
    expect(r.error.code).toBe("MATRICULA_DUPLICADA");
  });

  it("isola tenants: tenant B não enxerga aluno nem matrícula do tenant A", async () => {
    const { useCase, repo } = setup();
    const r = await useCase.execute({ alunoId: "al1", turmaId: "t1", planoId: "pl1" }, ctxB);
    expect(r.error.code).toBe("ALUNO_NAO_ENCONTRADO");

    const ok = await useCase.execute({ alunoId: "al1", turmaId: "t1", planoId: "pl1" }, ctxA);
    expect(await repo.findById(ok.value.matriculaId, ctxB)).toBeNull();
  });
});
