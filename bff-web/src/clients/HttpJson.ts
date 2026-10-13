import { RawResponse } from "../types";

interface Chamador { token: string; requestId?: string }

export class UpstreamError extends Error {
  constructor(public readonly service: string, detail: string, public readonly status?: number) {
    super(`${service}: ${detail}`);
  }
}

export class HttpJson {
  constructor(private readonly service: string, private readonly baseUrl: string, private readonly timeoutMs = 4000) {}

  async request<T>(method: "GET" | "POST", path: string, s: Chamador, body?: unknown): Promise<RawResponse<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${s.token}`, ...(s.requestId ? { "x-request-id": s.requestId } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const text = await res.text();
      return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
    } catch (err) {
      throw new UpstreamError(this.service, (err as Error).message);
    }
  }

  async getOk<T>(path: string, s: Chamador): Promise<T> {
    const r = await this.request<T>("GET", path, s);
    if (r.status < 200 || r.status >= 300) throw new UpstreamError(this.service, `HTTP ${r.status}`, r.status);
    return r.body;
  }
}
