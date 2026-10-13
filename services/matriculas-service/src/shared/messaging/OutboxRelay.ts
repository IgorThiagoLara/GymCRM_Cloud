import { edaLog } from "../events/edaLog";
import { IEventPublisher } from "../events/IEventPublisher";
import { IOutboxStore } from "../events/IOutboxStore";

export class OutboxRelay {
  private timer?: NodeJS.Timeout;
  private rodando = false;

  constructor(
    private readonly outbox: IOutboxStore,
    private readonly broker: IEventPublisher,
    private readonly servico: string,
    private readonly intervaloMs = 1000,
    private readonly lote = 50
  ) {}

  async drenarUmaVez(): Promise<number> {
    let publicados = 0;
    for (const rec of await this.outbox.pendentes(this.lote)) {
      try {
        await this.broker.publish(JSON.parse(rec.payload));
        await this.outbox.marcarPublicado(rec.id);
        publicados++;
        edaLog(this.servico, "relay publicou no broker", { eventId: rec.id, evento: rec.name });
      } catch (err) {
        await this.outbox.registrarFalha(rec.id, (err as Error).message);
        edaLog(this.servico, "relay falhou (permanece PENDENTE)", { eventId: rec.id, erro: (err as Error).message });
        break;
      }
    }
    return publicados;
  }

  start(): void {
    this.timer = setInterval(() => {
      if (this.rodando) return;
      this.rodando = true;
      this.drenarUmaVez().catch((e) => console.error("[EDA] relay:", e)).finally(() => { this.rodando = false; });
    }, this.intervaloMs);
  }

  stop(): void { if (this.timer) clearInterval(this.timer); }
}
