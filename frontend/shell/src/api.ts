import type { ApiClient } from "./contract";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function criarApi(getToken: () => string | null, onUnauthorized: () => void): ApiClient {
  async function call(method: string, path: string, body?: unknown) {
    const token = getToken();
    const res = await fetch(path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) onUnauthorized();
    const text = await res.text();
    return { status: res.status, data: text ? JSON.parse(text) : null };
  }
  return {
    async get<T>(path: string): Promise<T> {
      const r = await call("GET", path);
      if (r.status < 200 || r.status >= 300) throw new ApiError(r.status, r.data?.error ?? `HTTP ${r.status}`);
      return r.data as T;
    },
    async post<T>(path: string, body: unknown) {
      return (await call("POST", path, body)) as { status: number; data: T };
    },
  };
}

export async function login(email: string, senha: string) {
  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  if (!res.ok) throw new ApiError(res.status, res.status === 401 ? "E-mail ou senha inválidos" : "Falha ao entrar");
  return (await res.json()) as { token: string; usuario: import("./contract").Usuario };
}
