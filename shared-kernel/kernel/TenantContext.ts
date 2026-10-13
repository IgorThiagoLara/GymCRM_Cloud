export type Perfil = "ADMIN" | "RECEPCIONISTA" | "INSTRUTOR" | "ALUNO";

export interface TenantContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly perfil: Perfil;
}
