import { Entity } from "../../../../shared/kernel/Entity";

export interface AlunoProps { id: string; tenantId: string; nome: string; email: string; }

export class Aluno extends Entity {
  private constructor(id: string, tenantId: string, public readonly nome: string, public readonly email: string) {
    super(id, tenantId);
  }
  static reconstituir(p: AlunoProps): Aluno { return new Aluno(p.id, p.tenantId, p.nome, p.email); }
}
