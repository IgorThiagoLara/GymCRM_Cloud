import * as amqp from "amqplib";
import { DomainEvent } from "../events/DomainEvent";
import { edaLog } from "../events/edaLog";
import { IEventHandler } from "../events/IEventHandler";
import { IEventPublisher } from "../events/IEventPublisher";
import { IEventSubscriber } from "../events/IEventSubscriber";

export interface RabbitMqOptions {
  url: string;
  serviceName: string;
  exchange?: string;
  retryDelaysMs?: number[];
}

export class RabbitMqEventBus implements IEventPublisher, IEventSubscriber {
  private connection: any;
  private channel?: amqp.ConfirmChannel;
  private started = false;
  private readonly pending: { eventName: string; handler: IEventHandler<any> }[] = [];
  private readonly exchange: string;
  private readonly dlx: string;
  private readonly delays: number[];

  constructor(private readonly opts: RabbitMqOptions) {
    this.exchange = opts.exchange ?? "gymcrm.events";
    this.dlx = `${this.exchange}.dlx`;
    this.delays = opts.retryDelaysMs ?? [2000, 5000, 15000];
  }

  subscribe<E extends DomainEvent>(eventName: string, handler: IEventHandler<E>): void {
    this.pending.push({ eventName, handler });
    if (this.started) void this.bind(eventName, handler);
  }

  async start(retries = 15, delayMs = 3000): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        this.connection = await amqp.connect(this.opts.url);
        break;
      } catch (err) {
        if (attempt >= retries) throw err;
        console.warn(`[RabbitMQ] indisponível (tentativa ${attempt}/${retries}); novo retry em ${delayMs}ms`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    this.channel = await this.connection.createConfirmChannel();
    const ch = this.channel!;
    await ch.assertExchange(this.exchange, "topic", { durable: true });
    await ch.assertExchange(this.dlx, "fanout", { durable: true });
    await ch.assertQueue("gymcrm.dead-letter", { durable: true });
    await ch.bindQueue("gymcrm.dead-letter", this.dlx, "");
    this.started = true;
    for (const p of this.pending) await this.bind(p.eventName, p.handler);
  }

  publish(event: DomainEvent): Promise<void> {
    const ch = this.channel;
    if (!ch) return Promise.reject(new Error("RabbitMqEventBus não iniciado (chame start())"));
    return new Promise<void>((resolve, reject) => {
      ch.publish(
        this.exchange, event.name, Buffer.from(JSON.stringify(event)),
        { persistent: true, contentType: "application/json", type: event.name, messageId: event.eventId, correlationId: event.correlationId },
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async bind(eventName: string, handler: IEventHandler<any>): Promise<void> {
    const ch = this.channel!;
    const queue = `${this.opts.serviceName}.${eventName}`;
    await ch.assertQueue(queue, { durable: true, arguments: { "x-dead-letter-exchange": this.dlx } });
    await ch.bindQueue(queue, this.exchange, eventName);
    for (const d of this.delays) {
      await ch.assertQueue(`${queue}.retry.${d}`, {
        durable: true,
        arguments: { "x-message-ttl": d, "x-dead-letter-exchange": "", "x-dead-letter-routing-key": queue },
      });
    }

    await ch.consume(queue, async (msg) => {
      if (!msg) return;
      const tentativa = Number(msg.properties.headers?.["x-attempt"] ?? 0) + 1;
      let id = msg.properties.messageId;
      try {
        const payload = JSON.parse(msg.content.toString());
        id = payload.eventId ?? id;
        await handler.handle(payload);
        ch.ack(msg);
      } catch (err) {
        const motivo = (err as Error).message;
        if (tentativa <= this.delays.length) {
          const espera = this.delays[tentativa - 1];
          edaLog(this.opts.serviceName, `RETRY ${tentativa}/${this.delays.length} em ${espera}ms`, { evento: eventName, eventId: id, erro: motivo });
          await new Promise<void>((resolve, reject) => {
            ch.sendToQueue(`${queue}.retry.${espera}`, msg.content, {
              persistent: true, contentType: "application/json", type: eventName,
              messageId: msg.properties.messageId, correlationId: msg.properties.correlationId,
              headers: { ...msg.properties.headers, "x-attempt": tentativa, "x-last-error": motivo.slice(0, 200) },
            }, (e) => (e ? reject(e) : resolve()));
          });
          ch.ack(msg);
        } else {
          edaLog(this.opts.serviceName, "DLQ (tentativas esgotadas)", { evento: eventName, eventId: id, erro: motivo });
          ch.nack(msg, false, false);
        }
      }
    });
  }
}
