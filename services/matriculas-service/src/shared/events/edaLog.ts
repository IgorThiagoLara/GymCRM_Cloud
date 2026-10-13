export function edaLog(servico: string, acao: string, dados: Record<string, unknown> = {}): void {
  console.log(`[EDA] ${servico} ${acao} ${Object.entries(dados).map(([k, v]) => `${k}=${v}`).join(" ")}`);
}
