export async function opcional<T>(servico: string, promessa: Promise<T>, padrao: T, degradados: string[]): Promise<T> {
  try {
    return await promessa;
  } catch (err) {
    console.warn(`[bff] dependência opcional indisponível (${servico}):`, (err as Error).message);
    degradados.push(servico);
    return padrao;
  }
}
