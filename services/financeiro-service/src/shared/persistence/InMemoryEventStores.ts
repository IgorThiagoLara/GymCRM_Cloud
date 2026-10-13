import { DomainEvent } from "../events/DomainEvent";
import { ConsumoInfo, IConsumoStore } from "../events/IConsumoStore";
import { EventoRegistro, IEventLogQuery } from "../events/IEventLog";
import { IOutboxStore, OutboxRecord } from "../events/IOutboxStore";
import { TenantContext } from "../kernel/TenantContext";

interface OutboxRow extends OutboxRecord { correlationId: string; publicadoEm: Date | null; criadoEm: Date; erro: string | null }
interface ConsumoRow extends ConsumoInfo { status: string; tentativas: number; erro: string | null; em: Date }

export class InMemoryOutboxStore implements IOutboxStore {
  readonly rows: OutboxRow[] = [];

  async add(event: DomainEvent): Promise<void> {
    this.rows.push({
      id: event.eventId, name: event.name, tenantId: event.tenantId, payload: JSON.stringify(event), attempts: 0,
      correlationId: event.correlationId, publicadoEm: null, criadoEm: new Date(), erro: null,
    });
  }
  async pendentes(limite: number): Promise<OutboxRecord[]> {
    return this.rows.filter((r) => !r.publicadoEm).slice(0, limite).map(({ id, name, tenantId, payload, attempts }) => ({ id, name, tenantId, payload, attempts }));
  }
  async marcarPublicado(id: string): Promise<void> {
    const r = this.rows.find((x) => x.id === id);
    if (r) { r.publicadoEm = new Date(); r.attempts++; r.erro = null; }
  }
  async registrarFalha(id: string, erro: string): Promise<void> {
    const r = this.rows.find((x) => x.id === id);
    if (r) { r.attempts++; r.erro = erro; }
  }
}

export class InMemoryConsumoStore implements IConsumoStore {
  readonly rows = new Map<string, ConsumoRow>();
  private key = (e: string, c: string) => `${e}|${c}`;

  async iniciar(i: ConsumoInfo): Promise<boolean> {
    const k = this.key(i.eventId, i.consumer);
    const atual = this.rows.get(k);
    if (atual && atual.status !== "FALHA") return false;
    this.rows.set(k, { ...i, status: "PROCESSANDO", tentativas: (atual?.tentativas ?? 0) + 1, erro: null, em: new Date() });
    return true;
  }
  async concluir(eventId: string, consumer: string): Promise<void> {
    const r = this.rows.get(this.key(eventId, consumer));
    if (r) { r.status = "PROCESSADO"; r.erro = null; r.em = new Date(); }
  }
  async falhar(eventId: string, consumer: string, erro: string): Promise<void> {
    const r = this.rows.get(this.key(eventId, consumer));
    if (r) { r.status = "FALHA"; r.erro = erro; r.em = new Date(); }
  }
}

export class InMemoryEventLogQuery implements IEventLogQuery {
  constructor(private readonly outbox?: InMemoryOutboxStore, private readonly consumo?: InMemoryConsumoStore) {}

  async listar(ctx: TenantContext, limite: number): Promise<EventoRegistro[]> {
    const pub: EventoRegistro[] = (this.outbox?.rows ?? []).filter((r) => r.tenantId === ctx.tenantId).map((r) => ({
      eventId: r.id, correlationId: r.correlationId, name: r.name, tenantId: r.tenantId, direcao: "PUBLICACAO",
      status: r.publicadoEm ? "PUBLICADO" : "PENDENTE", tentativas: r.attempts, erro: r.erro, em: r.publicadoEm ?? r.criadoEm,
    }));
    const con: EventoRegistro[] = [...(this.consumo?.rows.values() ?? [])].filter((r) => r.tenantId === ctx.tenantId).map((r) => ({
      eventId: r.eventId, correlationId: r.correlationId, name: r.name, tenantId: r.tenantId, direcao: "CONSUMO",
      status: r.status, tentativas: r.tentativas, erro: r.erro, em: r.em,
    }));
    return [...pub, ...con].sort((a, b) => +new Date(b.em) - +new Date(a.em)).slice(0, limite);
  }
}
