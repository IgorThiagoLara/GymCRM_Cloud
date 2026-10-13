export interface IUnitOfWork {
  run<T>(fn: () => Promise<T>): Promise<T>;
}

export class NoopUnitOfWork implements IUnitOfWork {
  run<T>(fn: () => Promise<T>): Promise<T> { return fn(); }
}
