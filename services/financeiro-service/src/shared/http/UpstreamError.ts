export class UpstreamUnavailableError extends Error {
  constructor(public readonly service: string, detail: string) {
    super(`Serviço "${service}" indisponível: ${detail}`);
    this.name = "UpstreamUnavailableError";
  }
}
