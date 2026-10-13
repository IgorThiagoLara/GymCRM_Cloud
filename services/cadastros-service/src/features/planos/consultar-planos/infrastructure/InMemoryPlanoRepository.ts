import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { IPlanoRepository } from "../application/ports";
import { Plano, PlanoProps } from "../domain/Plano";

export class InMemoryPlanoRepository implements IPlanoRepository {
  private readonly items: Plano[];
  constructor(seed: PlanoProps[] = []) { this.items = seed.map(Plano.reconstituir); }

  async listar(ctx: TenantContext): Promise<Plano[]> {
    return this.items.filter((p) => p.tenantId === ctx.tenantId);
  }
  async obter(id: string, ctx: TenantContext): Promise<Plano | null> {
    return this.items.find((p) => p.id === id && p.tenantId === ctx.tenantId) ?? null;
  }
}
