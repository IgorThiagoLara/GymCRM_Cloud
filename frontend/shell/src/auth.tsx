import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { criarApi, login as loginApi } from "./api";
import type { ApiClient, Usuario } from "./contract";

interface AuthState {
  usuario: Usuario | null;
  api: ApiClient;
  entrar(email: string, senha: string): Promise<void>;
  sair(): void;
}
const Ctx = createContext<AuthState | null>(null);

const KEY = "gymcrm.session";
function carregar(): { token: string; usuario: Usuario } | null {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "null"); } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const inicial = useRef(carregar());
  const [usuario, setUsuario] = useState<Usuario | null>(inicial.current?.usuario ?? null);
  const token = useRef<string | null>(inicial.current?.token ?? null);

  const sair = useCallback(() => {
    token.current = null;
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    setUsuario(null);
  }, []);

  const api = useMemo(() => criarApi(() => token.current, sair), [sair]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const r = await loginApi(email, senha);
    token.current = r.token;
    try { sessionStorage.setItem(KEY, JSON.stringify(r)); } catch { /* ignore */ }
    setUsuario(r.usuario);
  }, []);

  return <Ctx.Provider value={{ usuario, api, entrar, sair }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fora do AuthProvider");
  return v;
}
