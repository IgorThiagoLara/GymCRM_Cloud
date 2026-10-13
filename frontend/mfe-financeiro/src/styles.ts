export const css = `
.mf h2 { margin: 0 0 4px; } .mf .sub { color: var(--muted, #6b7280); margin: 0 0 20px; }
.mf-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px; }
.mf-kpi { background: var(--surface, #fff); border: 1px solid var(--line, #e3e6eb); border-radius: 12px; padding: 16px; }
.mf-kpi span { display: block; font-size: 12px; color: var(--muted, #6b7280); text-transform: uppercase; letter-spacing: .4px; }
.mf-kpi strong { font-size: 22px; }
.mf-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.mf-tabs button { background: #e5e7eb; color: #374151; } .mf-tabs button.on { background: var(--brand, #0f766e); color: #fff; }
.mf-card { background: var(--surface, #fff); border: 1px solid var(--line, #e3e6eb); border-radius: 12px; padding: 20px; overflow-x: auto; }
.mf table { width: 100%; border-collapse: collapse; font-size: 14px; }
.mf th { text-align: left; color: var(--muted, #6b7280); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .4px; padding: 0 8px 8px; }
.mf td { padding: 10px 8px; border-top: 1px solid var(--line, #e3e6eb); }
.mf-badge { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #eef2f6; color: #344054; }
.mf-badge.ok { background: #ecfdf3; color: #067647; } .mf-badge.warn { background: #fffaeb; color: #b54708; } .mf-badge.bad { background: #fef3f2; color: #b42318; }
.mf-aviso { background: #fffaeb; border: 1px solid #fedf89; color: #93370d; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 14px; }
.mf-vazio { color: var(--muted, #6b7280); padding: 24px 0; text-align: center; }
`;
