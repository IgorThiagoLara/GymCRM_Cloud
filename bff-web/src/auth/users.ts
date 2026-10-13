import { timingSafeEqual } from "crypto";
import { Perfil } from "../types";

export interface DemoUser { id: string; email: string; senha: string; tenantId: string; perfil: Perfil; nome: string }

export const DEMO_USERS: DemoUser[] = [
  { id: "u-admin-a", email: "admin@academia-a.com", senha: "admin123", tenantId: "academia-a", perfil: "ADMIN", nome: "Admin Academia A" },
  { id: "u-recep-a", email: "recepcao@academia-a.com", senha: "recepcao123", tenantId: "academia-a", perfil: "RECEPCIONISTA", nome: "Recepção Academia A" },
  { id: "u-admin-b", email: "admin@academia-b.com", senha: "admin123", tenantId: "academia-b", perfil: "ADMIN", nome: "Admin Academia B" },
];

export function autenticar(email: string, senha: string): DemoUser | null {
  const u = DEMO_USERS.find((x) => x.email === email);
  if (!u) return null;
  const a = Buffer.from(u.senha), b = Buffer.from(senha);
  return a.length === b.length && timingSafeEqual(a, b) ? u : null;
}
