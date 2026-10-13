import { useEffect, useState } from "react";
import type { MfeProps } from "./contract";
import { css } from "./styles";
import type { CobrancasResponse, NotificacaoView } from "./types";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const tom = (s: string) => (s === "PAGA" || s === "ENVIADA" ? "ok" : s === "PENDENTE" ? "warn" : "bad");

export default function App({ api, usuario }: MfeProps) {
  const [aba, setAba] = useState<"cobrancas" | "emails">("cobrancas");
  const [cobrancas, setCobrancas] = useState<CobrancasResponse | null>(null);
  const [emails, setEmails] = useState<NotificacaoView[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.get<CobrancasResponse>("/api/cobrancas").then(setCobrancas).catch(() => setErro("Não foi possível carregar as cobranças."));
  }, [api]);

  useEffect(() => {
    if (aba === "emails" && emails === null)
      api.get<NotificacaoView[]>("/api/notificacoes").then(setEmails).catch(() => setErro("Não foi possível carregar os e-mails enviados."));
  }, [aba, api, emails]);

  return (
    <section className="mf">
      <style>{css}</style>
      <h2>Financeiro</h2>
      <p className="sub">Cobranças geradas automaticamente a cada matrícula · {usuario.tenantId}</p>
      {erro && <div className="mf-aviso" role="alert">{erro}</div>}

      <div className="mf-kpis">
        <div className="mf-kpi"><span>Pendente</span><strong>{brl(cobrancas?.totais.pendente ?? 0)}</strong></div>
        <div className="mf-kpi"><span>Pago</span><strong>{brl(cobrancas?.totais.paga ?? 0)}</strong></div>
        <div className="mf-kpi"><span>Recusado</span><strong>{brl(cobrancas?.totais.recusada ?? 0)}</strong></div>
      </div>

      <div className="mf-tabs">
        <button className={aba === "cobrancas" ? "on" : ""} onClick={() => setAba("cobrancas")}>Cobranças</button>
        <button className={aba === "emails" ? "on" : ""} onClick={() => setAba("emails")}>E-mails enviados</button>
      </div>

      <div className="mf-card">
        {aba === "cobrancas" ? (
          <>
            {cobrancas?.degradado.length ? <div className="mf-aviso">Nomes de aluno/plano indisponíveis no momento ({cobrancas.degradado.join(", ")}).</div> : null}
            {!cobrancas ? <div className="mf-vazio">Carregando…</div> : cobrancas.itens.length === 0 ? <div className="mf-vazio">Nenhuma cobrança gerada.</div> : (
              <table>
                <thead><tr><th>Aluno</th><th>Plano</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead>
                <tbody>
                  {cobrancas.itens.map((c) => (
                    <tr key={c.id}>
                      <td>{c.alunoNome ?? "—"}</td><td>{c.planoNome ?? "—"}</td><td>{brl(c.valor)}</td><td>{dia(c.vencimento)}</td>
                      <td><span className={`mf-badge ${tom(c.status)}`}>{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : !emails ? <div className="mf-vazio">Carregando…</div> : emails.length === 0 ? <div className="mf-vazio">Nenhum e-mail enviado.</div> : (
          <table>
            <thead><tr><th>Quando</th><th>Destinatário</th><th>Assunto</th><th>Status</th></tr></thead>
            <tbody>
              {emails.map((n) => (
                <tr key={n.id}>
                  <td>{new Date(n.criadaEm).toLocaleString("pt-BR")}</td><td>{n.destinatario}</td><td>{n.assunto}</td>
                  <td><span className={`mf-badge ${tom(n.status)}`}>{n.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
