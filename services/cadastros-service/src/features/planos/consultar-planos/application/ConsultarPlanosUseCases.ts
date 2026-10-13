import { DomainError } from "../../../../shared/kernel/DomainError";
import { Result } from "../../../../shared/kernel/Result";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { Plano } from "../domain/Plano";
import { IPlanoRepository, PlanoOutput } from "./ports";

const toOutput = (p: Plano): PlanoOutput => ({ id: p.id, nome: p.nome, valor: p.valor, duracaoMeses: p.duracaoMeses });

export class ListarPlanosUseCase {
  constructor(private readonly planos: IPlanoRepository) {}
  async execute(ctx: TenantContext): Promise<Result<PlanoOutput[]>> {
    return Result.ok((await this.planos.listar(ctx)).map(toOutput));
  }
}

export class ObterPlanoUseCase {
  constructor(private readonly planos: IPlanoRepository) {}
  async execute(id: string, ctx: TenantContext): Promise<Result<PlanoOutput>> {
    const plano = await this.planos.obter(id, ctx);
    if (!plano) return Result.fail<PlanoOutput>(new DomainError("PLANO_NAO_ENCONTRADO", "Plano não encontrado para este tenant."));
    return Result.ok(toOutput(plano));
  }
}
