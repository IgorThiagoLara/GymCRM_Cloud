import { randomUUID } from "crypto";
import { Entity } from "../../../../shared/kernel/Entity";
import { Result } from "../../../../shared/kernel/Result";
import { DuracaoInvalidaError, TransicaoInvalidaError } from "./MatriculaErrors";
import { StatusMatricula } from "./StatusMatricula";

export interface NovaMatriculaProps {
  tenantId: string;
  alunoId: string;
  turmaId: string;
  planoId: string;
  duracaoMeses: number;
  dataInicio?: Date;
}

export class Matricula extends Entity {
  private constructor(
    id: string,
    tenantId: string,
    public readonly alunoId: string,
    public readonly turmaId: string,
    public readonly planoId: string,
    public readonly dataInicio: Date,
    private _dataFim: Date,
    private _status: StatusMatricula
  ) {
    super(id, tenantId);
  }

  static criar(props: NovaMatriculaProps): Result<Matricula> {
    if (props.duracaoMeses < 1) return Result.fail(new DuracaoInvalidaError());
    const inicio = props.dataInicio ?? new Date();
    const fim = new Date(inicio);
    fim.setMonth(fim.getMonth() + props.duracaoMeses);
    return Result.ok(
      new Matricula(randomUUID(), props.tenantId, props.alunoId, props.turmaId, props.planoId, inicio, fim, StatusMatricula.ATIVA)
    );
  }

  static reconstituir(p: {
    id: string; tenantId: string; alunoId: string; turmaId: string; planoId: string;
    dataInicio: Date; dataFim: Date; status: StatusMatricula;
  }): Matricula {
    return new Matricula(p.id, p.tenantId, p.alunoId, p.turmaId, p.planoId, p.dataInicio, p.dataFim, p.status);
  }

  get status(): StatusMatricula { return this._status; }
  get dataFim(): Date { return this._dataFim; }
  get estaAtiva(): boolean { return this._status === StatusMatricula.ATIVA; }

  cancelar(): Result<void> {
    if (this._status === StatusMatricula.CANCELADA)
      return Result.fail(new TransicaoInvalidaError("A matrícula já está cancelada."));
    this._status = StatusMatricula.CANCELADA;
    return Result.ok(undefined);
  }

  trancar(): Result<void> {
    if (this._status !== StatusMatricula.ATIVA)
      return Result.fail(new TransicaoInvalidaError("Somente matrículas ativas podem ser trancadas."));
    this._status = StatusMatricula.TRANCADA;
    return Result.ok(undefined);
  }

  renovar(meses: number): Result<void> {
    if (meses < 1) return Result.fail(new DuracaoInvalidaError());
    if (this._status === StatusMatricula.CANCELADA)
      return Result.fail(new TransicaoInvalidaError("Matrícula cancelada não pode ser renovada."));
    const novoFim = new Date(this._dataFim);
    novoFim.setMonth(novoFim.getMonth() + meses);
    this._dataFim = novoFim;
    this._status = StatusMatricula.ATIVA;
    return Result.ok(undefined);
  }
}
