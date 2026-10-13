import { AsyncLocalStorage } from "async_hooks";
import { Pool, PoolClient } from "pg";
import { IUnitOfWork } from "../kernel/IUnitOfWork";
import { Queryable } from "./Queryable";

export class PgUnitOfWork implements IUnitOfWork {
  private readonly als = new AsyncLocalStorage<PoolClient>();

  constructor(private readonly pool: Pool) {}

  readonly executor: Queryable = {
    query: (text, params) => ((this.als.getStore() ?? this.pool) as any).query(text, params),
  };

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.als.getStore()) return fn();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await this.als.run(client, fn);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch {  }
      throw err;
    } finally {
      client.release();
    }
  }
}
