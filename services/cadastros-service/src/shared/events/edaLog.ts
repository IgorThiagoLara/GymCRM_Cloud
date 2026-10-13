/** Log estruturado simples do fluxo de eventos. Procure por "[EDA]" nos logs dos containers para acompanhar o fluxo. */
export function edaLog(servico: string, acao: string, dados: Record<string, unknown> = {}): void {
  console.log(`[EDA] ${servico} ${acao} ${Object.entries(dados).map(([k, v]) => `${k}=${v}`).join(" ")}`);
}
