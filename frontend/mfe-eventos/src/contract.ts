export interface ApiResult<T> { status: number; data: T }

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<ApiResult<T>>;
}

export interface Usuario { id: string; nome: string; perfil: "ADMIN" | "RECEPCIONISTA" | "INSTRUTOR" | "ALUNO"; tenantId: string }

export interface MfeProps { api: ApiClient; usuario: Usuario }
