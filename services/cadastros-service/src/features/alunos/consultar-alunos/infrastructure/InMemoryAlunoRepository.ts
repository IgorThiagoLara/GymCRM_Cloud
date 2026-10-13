import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { IAlunoRepository } from "../application/ports";
import { Aluno, AlunoProps } from "../domain/Aluno";

export class InMemoryAlunoRepository implements IAlunoRepository {
  private readonly items: Aluno[];
  constructor(seed: AlunoProps[] = []) { this.items = seed.map(Aluno.reconstituir); }

  async listar(ctx: TenantContext): Promise<Aluno[]> {
    return this.items.filter((a) => a.tenantId === ctx.tenantId);
  }
  async obter(id: string, ctx: TenantContext): Promise<Aluno | null> {
    return this.items.find((a) => a.id === id && a.tenantId === ctx.tenantId) ?? null;
  }
}
