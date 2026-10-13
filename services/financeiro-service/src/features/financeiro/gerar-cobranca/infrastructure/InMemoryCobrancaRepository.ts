import { InMemoryStore } from "../../../../shared/persistence/InMemoryStore";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { ICobrancaRepository } from "../application/ICobrancaRepository";
import { Cobranca } from "../domain/Cobranca";
import { CobrancaRow, fromRow, toRow } from "./CobrancaRow";

export class InMemoryCobrancaRepository implements ICobrancaRepository {
  constructor(private readonly store: InMemoryStore<CobrancaRow> = new InMemoryStore<CobrancaRow>()) {}

  async save(cobranca: Cobranca, ctx: TenantContext): Promise<void> {
    if (cobranca.tenantId !== ctx.tenantId) throw new Error("Tentativa de gravar cobrança em outro tenant");
    this.store.rows.set(cobranca.id, toRow(cobranca));
  }

  async findByMatricula(matriculaId: string, ctx: TenantContext): Promise<Cobranca[]> {
    return [...this.store.rows.values()]
      .filter((r) => r.tenantId === ctx.tenantId && r.matriculaId === matriculaId)
      .map(fromRow);
  }
}
