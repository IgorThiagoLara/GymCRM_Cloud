import { Entity } from "../../../../shared/kernel/Entity";

export interface PlanoProps { id: string; tenantId: string; nome: string; valor: number; duracaoMeses: number; }

export class Plano extends Entity {
  private constructor(id: string, tenantId: string, public readonly nome: string, public readonly valor: number, public readonly duracaoMeses: number) {
    super(id, tenantId);
  }
  static reconstituir(p: PlanoProps): Plano { return new Plano(p.id, p.tenantId, p.nome, p.valor, p.duracaoMeses); }
}
