import { randomUUID } from "crypto";
import { DomainError } from "../../../../shared/kernel/DomainError";
import { Entity } from "../../../../shared/kernel/Entity";
import { Result } from "../../../../shared/kernel/Result";

export enum StatusCobranca {
  PENDENTE = "PENDENTE",
  PAGA = "PAGA",
  RECUSADA = "RECUSADA",
}

export class Cobranca extends Entity {
  private constructor(
    id: string,
    tenantId: string,
    public readonly matriculaId: string,
    public readonly valor: number,
    public readonly vencimento: Date,
    private _status: StatusCobranca
  ) {
    super(id, tenantId);
  }

  static gerar(props: { tenantId: string; matriculaId: string; valor: number; diasParaVencer?: number }): Result<Cobranca> {
    if (props.valor <= 0) return Result.fail(new DomainError("VALOR_INVALIDO", "O valor da cobrança deve ser maior que zero."));
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + (props.diasParaVencer ?? 30));
    return Result.ok(new Cobranca(randomUUID(), props.tenantId, props.matriculaId, props.valor, vencimento, StatusCobranca.PENDENTE));
  }

  static reconstituir(p: {
    id: string; tenantId: string; matriculaId: string; valor: number; vencimento: Date; status: StatusCobranca;
  }): Cobranca {
    return new Cobranca(p.id, p.tenantId, p.matriculaId, p.valor, p.vencimento, p.status);
  }

  get status(): StatusCobranca { return this._status; }
  registrarPagamento(): void { this._status = StatusCobranca.PAGA; }
  marcarRecusada(): void { this._status = StatusCobranca.RECUSADA; }
}
