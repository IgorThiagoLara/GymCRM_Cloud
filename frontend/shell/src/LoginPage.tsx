import { FormEvent, useState } from "react";
import { useAuth } from "./auth";

export default function LoginPage() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState("recepcao@academia-a.com");
  const [senha, setSenha] = useState("recepcao123");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null); setCarregando(true);
    try { await entrar(email, senha); } catch (err) { setErro((err as Error).message); } finally { setCarregando(false); }
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={enviar}>
        <h1>GymCRM</h1>
        <p className="muted">Acesse sua academia</p>
        <label>E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
        <label>Senha<input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" required /></label>
        {erro && <p className="erro-texto" role="alert">{erro}</p>}
        <button disabled={carregando}>{carregando ? "Entrando…" : "Entrar"}</button>
        <p className="muted small">Demo: recepcao@academia-a.com / recepcao123 · admin@academia-b.com / admin123</p>
      </form>
    </div>
  );
}
