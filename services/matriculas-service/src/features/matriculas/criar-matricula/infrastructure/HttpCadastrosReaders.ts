import jwt from "jsonwebtoken";
import { UpstreamUnavailableError } from "../../../../shared/http/UpstreamError";
import { TenantContext } from "../../../../shared/kernel/TenantContext";
import { AlunoDTO, IAlunoReader, IPlanoReader, PlanoDTO } from "../application/ports";

export interface CadastrosClientOptions {
  baseUrl: string;
  jwtSecret: string;
  timeoutMs?: number;
}

class CadastrosHttp {
  constructor(private readonly o: CadastrosClientOptions) {}

  async get<T>(path: string, ctx: TenantContext): Promise<T | null> {
    const token = jwt.sign({ sub: ctx.userId, tenantId: ctx.tenantId, perfil: ctx.perfil }, this.o.jwtSecret, { expiresIn: "60s" });
    let res: Response;
    try {
      res = await fetch(`${this.o.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(this.o.timeoutMs ?? 3000),
      });
    } catch (err) {
      throw new UpstreamUnavailableError("cadastros", (err as Error).message);
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new UpstreamUnavailableError("cadastros", `HTTP ${res.status}`);
    return (await res.json()) as T;
  }
}

export class HttpAlunoReader implements IAlunoReader {
  private readonly http: CadastrosHttp;
  constructor(o: CadastrosClientOptions) { this.http = new CadastrosHttp(o); }
  obter(alunoId: string, ctx: TenantContext): Promise<AlunoDTO | null> {
    return this.http.get<AlunoDTO>(`/alunos/${encodeURIComponent(alunoId)}`, ctx);
  }
}

export class HttpPlanoReader implements IPlanoReader {
  private readonly http: CadastrosHttp;
  constructor(o: CadastrosClientOptions) { this.http = new CadastrosHttp(o); }
  obter(planoId: string, ctx: TenantContext): Promise<PlanoDTO | null> {
    return this.http.get<PlanoDTO>(`/planos/${encodeURIComponent(planoId)}`, ctx);
  }
}
