import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { AlunoDTO, IAlunoReader, IPlanoReader, PlanoDTO } from "../application/ports";

export class InMemoryAlunoReader implements IAlunoReader {
  constructor(private readonly dados: (AlunoDTO & { tenantId: string })[]) {}
  async obter(alunoId: string, ctx: TenantContext): Promise<AlunoDTO | null> {
    const a = this.dados.find((x) => x.id === alunoId && x.tenantId === ctx.tenantId);
    return a ? { id: a.id, nome: a.nome, email: a.email } : null;
  }
}

export class InMemoryPlanoReader implements IPlanoReader {
  constructor(private readonly dados: (PlanoDTO & { tenantId: string })[]) {}
  async obter(planoId: string, ctx: TenantContext): Promise<PlanoDTO | null> {
    const p = this.dados.find((x) => x.id === planoId && x.tenantId === ctx.tenantId);
    return p ? { id: p.id, nome: p.nome, valor: p.valor, duracaoMeses: p.duracaoMeses } : null;
  }
}
