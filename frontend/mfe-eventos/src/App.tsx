import { useCallback, useEffect, useState } from "react";
import type { MfeProps } from "./contract";
import { css } from "./styles";
import type { EtapaView, EventosResponse, FluxoView } from "./types";

const tom = (s: string) => (["PUBLICADO", "PROCESSADO", "CONCLUIDO"].includes(s) ? "ok" : ["FALHA", "COM_FALHA"].includes(s) ? "bad" : "warn");
const rotulo: Record<FluxoView["status"], string> = { CONCLUIDO: "Concluído", EM_ANDAMENTO: "Em andamento", COM_FALHA: "Com falha" };
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR");

function Etapa({ e }: { e: EtapaView }) {
  return (
    <li className={tom(e.status)}>
      <span className="me-svc">{e.servico}</span>
      <span className="me-dir">{e.direcao === "PUBLICACAO" ? "publicou" : "consumiu"}</span>
      <strong>{e.evento}</strong>
      <span className={`me-badge ${tom(e.status)}`}>{e.status}</span>
      {e.tentativas > 1 && <span className="me-dir">· {e.tentativas} tentativas</span>}
      <span className="me-dir">· {hora(e.em)}</span>
      {e.erro && <span className="me-erro">Último erro: {e.erro}</span>}
    </li>
  );
}

export default function App({ api }: MfeProps) {
  const [dados, setDados] = useState<EventosResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);

  const carregar = useCallback(async () => {
    try { setDados(await api.get<EventosResponse>("/api/eventos")); setErro(null); }
    catch { setErro("Não foi possível carregar os eventos."); }
  }, [api]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => void carregar(), 3000);
    return () => clearInterval(t);
  }, [auto, carregar]);

  return (
    <section className="me">
      <style>{css}</style>
      <h2>Monitor de eventos</h2>
      <p className="sub">
        Cada cartão é um fluxo de negócio. Ex.: <b>matrículas</b> publica <code>MatriculaCriada</code> → <b>financeiro</b> consome e publica <code>CobrancaGerada</code> → <b>notificações</b> consome e envia o e-mail (Azure Function).
        Falhas aparecem com o número de tentativas: o broker repete com backoff e, esgotadas, manda a mensagem para a DLQ.
      </p>
      {erro && <div className="me-aviso" role="alert">{erro}</div>}
      {dados?.degradado.length ? <div className="me-aviso">Sem dados de: {dados.degradado.join(", ")}. A trilha pode estar incompleta.</div> : null}

      <div className="me-top">
        <div className="me-kpi"><span>Fluxos</span><strong>{dados?.resumo.fluxos ?? 0}</strong></div>
        <div className="me-kpi ok"><span>Concluídos</span><strong>{dados?.resumo.concluidos ?? 0}</strong></div>
        <div className="me-kpi warn"><span>Em andamento</span><strong>{dados?.resumo.emAndamento ?? 0}</strong></div>
        <div className="me-kpi bad"><span>Com falha</span><strong>{dados?.resumo.comFalha ?? 0}</strong></div>
        <div className="me-tools">
          <label><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Atualizar a cada 3 s</label>
          <button onClick={() => void carregar()}>Atualizar</button>
        </div>
      </div>

      {!dados ? <div className="me-vazio">Carregando…</div> : dados.fluxos.length === 0 ? (
        <div className="me-vazio">Nenhum evento ainda. Crie uma matrícula para ver o fluxo acontecer.</div>
      ) : dados.fluxos.map((f) => (
        <article className="me-fluxo" key={f.correlationId}>
          <header>
            <span className={`me-badge ${tom(f.status)}`}>{rotulo[f.status]}</span>
            <code title="correlationId">{f.correlationId.slice(0, 8)}</code>
            <time>{new Date(f.inicio).toLocaleString("pt-BR")}</time>
          </header>
          <ul className="me-steps">{f.etapas.map((e, i) => <Etapa key={i} e={e} />)}</ul>
        </article>
      ))}
    </section>
  );
}
