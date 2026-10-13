export const css = `
.me h2 { margin: 0 0 4px; } .me .sub { color: var(--muted, #6b7280); margin: 0 0 20px; max-width: 760px; }
.me-top { display: flex; gap: 14px; flex-wrap: wrap; align-items: stretch; margin-bottom: 18px; }
.me-kpi { background: var(--surface, #fff); border: 1px solid var(--line, #e3e6eb); border-radius: 12px; padding: 14px 18px; min-width: 130px; }
.me-kpi span { display: block; font-size: 12px; color: var(--muted, #6b7280); text-transform: uppercase; letter-spacing: .4px; }
.me-kpi strong { font-size: 24px; }
.me-kpi.bad strong { color: #b42318; } .me-kpi.warn strong { color: #b54708; } .me-kpi.ok strong { color: #067647; }
.me-tools { margin-left: auto; display: flex; align-items: center; gap: 12px; font-size: 14px; }
.me-tools label { margin: 0; display: flex; align-items: center; gap: 6px; color: var(--ink, #1b1f27); }
.me-tools input { width: auto; }
.me-fluxo { background: var(--surface, #fff); border: 1px solid var(--line, #e3e6eb); border-radius: 12px; padding: 16px 18px; margin-bottom: 14px; }
.me-fluxo header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.me-fluxo code { font-size: 12px; background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
.me-fluxo time { color: var(--muted, #6b7280); font-size: 13px; margin-left: auto; }
.me-badge { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #eef2f6; color: #344054; }
.me-badge.ok { background: #ecfdf3; color: #067647; } .me-badge.warn { background: #fffaeb; color: #b54708; } .me-badge.bad { background: #fef3f2; color: #b42318; }
.me-steps { list-style: none; margin: 0; padding: 0 0 0 14px; border-left: 2px solid var(--line, #e3e6eb); }
.me-steps li { position: relative; padding: 6px 0 6px 14px; font-size: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
.me-steps li::before { content: ""; position: absolute; left: -22px; top: 13px; width: 10px; height: 10px; border-radius: 50%; background: #98a2b3; }
.me-steps li.ok::before { background: #12b76a; } .me-steps li.warn::before { background: #f79009; } .me-steps li.bad::before { background: #f04438; }
.me-svc { font-weight: 700; } .me-dir { color: var(--muted, #6b7280); }
.me-erro { flex-basis: 100%; color: #b42318; font-size: 13px; }
.me-aviso { background: #fffaeb; border: 1px solid #fedf89; color: #93370d; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 14px; }
.me-vazio { color: var(--muted, #6b7280); padding: 24px 0; text-align: center; }
`;
