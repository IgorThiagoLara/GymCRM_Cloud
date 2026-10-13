import { DomainError } from "../../../../shared/kernel/DomainError";
import { Result } from "../../../../shared/kernel/Result";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { Aluno } from "../domain/Aluno";
import { AlunoOutput, IAlunoRepository } from "./ports";

const toOutput = (a: Aluno): AlunoOutput => ({ id: a.id, nome: a.nome, email: a.email });

export class ListarAlunosUseCase {
  constructor(private readonly alunos: IAlunoRepository) {}
  async execute(ctx: TenantContext): Promise<Result<AlunoOutput[]>> {
    return Result.ok((await this.alunos.listar(ctx)).map(toOutput));
  }
}

export class ObterAlunoUseCase {
  constructor(private readonly alunos: IAlunoRepository) {}
  async execute(id: string, ctx: TenantContext): Promise<Result<AlunoOutput>> {
    const aluno = await this.alunos.obter(id, ctx);
    if (!aluno) return Result.fail<AlunoOutput>(new DomainError("ALUNO_NAO_ENCONTRADO", "Aluno não encontrado para este tenant."));
    return Result.ok(toOutput(aluno));
  }
}
