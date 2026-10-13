import { IEventPublisher } from "../../../../shared/events/IEventPublisher";
import { DomainError } from "../../../../shared/kernel/DomainError";
import { IUnitOfWork, NoopUnitOfWork } from "../../../../shared/kernel/IUnitOfWork";
import { Result } from "../../../../shared/kernel/Result";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { Matricula } from "../domain/Matricula";
import { MatriculaCriadaEvent } from "../domain/MatriculaCriadaEvent";
import { AlunoNaoEncontradoError, MatriculaDuplicadaError, PlanoNaoEncontradoError } from "../domain/MatriculaErrors";
import { CriarMatriculaCommand, CriarMatriculaOutput } from "./CriarMatriculaCommand";
import { IAlunoReader, IMatriculaRepository, IPlanoReader } from "./ports";

export class CriarMatriculaUseCase {
  constructor(
    private readonly matriculas: IMatriculaRepository,
    private readonly alunos: IAlunoReader,
    private readonly planos: IPlanoReader,
    private readonly events: IEventPublisher,
    private readonly uow: IUnitOfWork = new NoopUnitOfWork()
  ) {}

  async execute(cmd: CriarMatriculaCommand, ctx: TenantContext): Promise<Result<CriarMatriculaOutput>> {
    const aluno = await this.alunos.obter(cmd.alunoId, ctx);
    if (!aluno) return Result.fail<CriarMatriculaOutput>(new AlunoNaoEncontradoError());

    const plano = await this.planos.obter(cmd.planoId, ctx);
    if (!plano) return Result.fail<CriarMatriculaOutput>(new PlanoNaoEncontradoError());

    const existente = await this.matriculas.findAtivaByAluno(cmd.alunoId, ctx);
    if (existente) return Result.fail<CriarMatriculaOutput>(new MatriculaDuplicadaError());

    const criada = Matricula.criar({
      tenantId: ctx.tenantId,
      alunoId: cmd.alunoId,
      turmaId: cmd.turmaId,
      planoId: cmd.planoId,
      duracaoMeses: plano.duracaoMeses,
    });
    if (!criada.isSuccess) return Result.fail<CriarMatriculaOutput>(criada.error);

    const matricula = criada.value;
    try {
      await this.uow.run(async () => {
        await this.matriculas.save(matricula, ctx);
        await this.events.publish(
          new MatriculaCriadaEvent(ctx.tenantId, matricula.id, aluno.id, aluno.email, plano.id, plano.valor)
        );
      });
    } catch (err) {
      if (err instanceof DomainError) return Result.fail<CriarMatriculaOutput>(err);
      throw err;
    }

    return Result.ok({ matriculaId: matricula.id, status: matricula.status, dataFim: matricula.dataFim });
  }
}
