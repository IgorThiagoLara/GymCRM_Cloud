import { FormEvent, useCallback, useEffect, useState } from "react";
import type { MfeProps } from "./contract";
import { css } from "./styles";
import type { MatriculasResponse, Opcoes } from "./types";

const MENSAGENS: Record<string, string> = {
  ALUNO_NAO_ENCONTRADO: "Aluno não encontrado.",
  PLANO_NAO_ENCONTRADO: "Plano não encontrado.",
  MATRICULA_DUPLICADA: "Este aluno já possui uma matrícula ativa.",
  VALIDACAO: "Preencha todos os campos.",
  SERVICO_INDISPONIVEL: "Serviço temporariamente indisponível. Tente novamente.",
};
const brl = (v: number | null) => (v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const tomStatus = (s: string) => (s === "ATIVA" || s === "PAGA" ? "ok" : s === "PENDENTE" || s === "TRANCADA" ? "warn" : "bad");

export default function App({ api, usuario }: MfeProps) {
  const [dados, setDados] = useState<MatriculasResponse | null>(null);
  const [opcoes, setOpcoes] = useState<Opcoes | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [alunoId, setAlunoId] = useState("");
  const [planoId, setPlanoId] = useState("");
  const [turmaId, setTurmaId] = useState("turma-1");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try { setDados(await api.get<MatriculasResponse>("/api/matriculas")); setErro(null); }
    catch { setErro("Não foi possível carregar as matrículas."); }
  }, [api]);

  useEffect(() => {
    void carregar();
    api.get<Opcoes>("/api/matriculas/opcoes").then(setOpcoes).catch(() => setErro("Não foi possível carregar alunos e planos."));
  }, [api, carregar]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setMsg(null); setEnviando(true);
    try {
      const r = await api.post<{ error?: string }>("/api/matriculas", { alunoId, planoId, turmaId });
      if (r.status === 201) {
        setMsg({ tipo: "ok", texto: "Matrícula criada! A cobrança é gerada em instantes (evento assíncrono)." });
        setAlunoId(""); setPlanoId("");
        await carregar();
        setTimeout(() => void carregar(), 1500); // cobrança chega de forma assíncrona (consistência eventual)
      } else {
        setMsg({ tipo: "erro", texto: MENSAGENS[r.data?.error ?? ""] ?? `Falha ao criar matrícula (HTTP ${r.status}).` });
      }
    } finally { setEnviando(false); }
  }

  return (
    <section className="mm">
      <style>{css}</style>
      <h2>Matrículas</h2>
      <p className="sub">Olá, {usuario.nome}. Crie e acompanhe matrículas e suas cobranças.</p>
      {erro && <div className="mm-aviso" role="alert">{erro}</div>}
      <div className="mm-grid">
        <form className="mm-card" onSubmit={enviar}>
          <h3>Nova matrícula</h3>
          <label>Aluno
            <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)} required>
              <option value="">Selecione…</option>
              {opcoes?.alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </label>
          <label>Plano
            <select value={planoId} onChange={(e) => setPlanoId(e.target.value)} required>
              <option value="">Selecione…</option>
              {opcoes?.planos.map((p) => <option key={p.id} value={p.id}>{p.nome} — {brl(p.valor)}</option>)}
            </select>
          </label>
          <label>Turma<input value={turmaId} onChange={(e) => setTurmaId(e.target.value)} required /></label>
          <button disabled={enviando}>{enviando ? "Criando…" : "Criar matrícula"}</button>
          {msg && <div className={`mm-msg ${msg.tipo}`} role="status">{msg.texto}</div>}
        </form>

        <div className="mm-card">
          <h3>Matrículas</h3>
          {dados?.degradado.length ? (
            <div className="mm-aviso">Alguns dados estão temporariamente indisponíveis ({dados.degradado.join(", ")}). Os demais seguem normais.</div>
          ) : null}
          {!dados ? <div className="mm-vazio">Carregando…</div> : dados.itens.length === 0 ? <div className="mm-vazio">Nenhuma matrícula ainda.</div> : (
            <table>
              <thead><tr><th>Aluno</th><th>Plano</th><th>Status</th><th>Vigência até</th><th>Cobrança</th></tr></thead>
              <tbody>
                {dados.itens.map((m) => (
                  <tr key={m.id}>
                    <td>{m.aluno.nome ?? m.aluno.id}</td>
                    <td>{m.plano.nome ?? m.plano.id}</td>
                    <td><span className={`mm-badge ${tomStatus(m.status)}`}>{m.status}</span></td>
                    <td>{data(m.dataFim)}</td>
                    <td>{m.cobranca ? <span className={`mm-badge ${tomStatus(m.cobranca.status)}`}>{m.cobranca.status} · {brl(m.cobranca.valor)}</span> : <span className="mm-badge">aguardando</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
