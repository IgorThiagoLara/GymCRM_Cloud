import { InMemoryStore } from "../../../../shared/persistence/InMemoryStore";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { IMatriculaRepository } from "../application/ports";
import { Matricula } from "../domain/Matricula";
import { fromRow, MatriculaRow, toRow } from "./MatriculaRow";

export class InMemoryMatriculaRepository implements IMatriculaRepository {
  constructor(private readonly store: InMemoryStore<MatriculaRow> = new InMemoryStore<MatriculaRow>()) {}

  async save(matricula: Matricula, ctx: TenantContext): Promise<void> {
    if (matricula.tenantId !== ctx.tenantId) throw new Error("Tentativa de gravar matrícula em outro tenant");
    this.store.rows.set(matricula.id, toRow(matricula));
  }

  async findById(id: string, ctx: TenantContext): Promise<Matricula | null> {
    const r = this.store.rows.get(id);
    return r && r.tenantId === ctx.tenantId ? fromRow(r) : null;
  }

  async findAtivaByAluno(alunoId: string, ctx: TenantContext): Promise<Matricula | null> {
    for (const r of this.store.rows.values()) {
      if (r.tenantId === ctx.tenantId && r.alunoId === alunoId && r.status === "ATIVA") return fromRow(r);
    }
    return null;
  }
}
