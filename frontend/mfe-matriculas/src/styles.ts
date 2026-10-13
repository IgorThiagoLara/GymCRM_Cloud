// CSS embutido no componente (prefixo mm-): garante estilo mesmo quando carregado via federation, sem depender de <link>.
export const css = `
.mm h2 { margin: 0 0 4px; } .mm .sub { color: var(--muted, #6b7280); margin: 0 0 20px; }
.mm-grid { display: grid; grid-template-columns: 320px 1fr; gap: 20px; align-items: start; }
@media (max-width: 900px) { .mm-grid { grid-template-columns: 1fr; } }
.mm-card { background: var(--surface, #fff); border: 1px solid var(--line, #e3e6eb); border-radius: 12px; padding: 20px; }
.mm-card h3 { margin: 0 0 14px; font-size: 16px; }
.mm table { width: 100%; border-collapse: collapse; font-size: 14px; }
.mm th { text-align: left; color: var(--muted, #6b7280); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .4px; padding: 0 8px 8px; }
.mm td { padding: 10px 8px; border-top: 1px solid var(--line, #e3e6eb); }
.mm-badge { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #eef2f6; color: #344054; }
.mm-badge.ok { background: #ecfdf3; color: #067647; } .mm-badge.warn { background: #fffaeb; color: #b54708; } .mm-badge.bad { background: #fef3f2; color: #b42318; }
.mm-aviso { background: #fffaeb; border: 1px solid #fedf89; color: #93370d; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 14px; }
.mm-msg { margin-top: 12px; font-size: 14px; } .mm-msg.ok { color: #067647; } .mm-msg.erro { color: #b42318; }
.mm-vazio { color: var(--muted, #6b7280); padding: 24px 0; text-align: center; }
`;
