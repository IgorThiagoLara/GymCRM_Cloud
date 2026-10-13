import { DomainError } from "./DomainError";

export class Result<T> {
  private constructor(
    public readonly isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: DomainError
  ) {}

  static ok<T>(value: T): Result<T> {
    return new Result<T>(true, value);
  }

  static fail<T>(error: DomainError): Result<T> {
    return new Result<T>(false, undefined, error);
  }

  get value(): T {
    if (!this.isSuccess) throw new Error("Result de falha não possui value");
    return this._value as T;
  }

  get error(): DomainError {
    if (this.isSuccess) throw new Error("Result de sucesso não possui error");
    return this._error as DomainError;
  }
}
