import { Kafka, Producer } from 'kafkajs';

export type DomainEvent<T = unknown> = {
  id: string;
  type: string;
  source: string;
  occurredAt: string;
  data: T;
};

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  disconnect(): Promise<void>;
}

export class KafkaEventPublisher implements EventPublisher {
  private producer?: Producer;

  constructor(private readonly source: string, private readonly brokers = (process.env.KAFKA_BROKERS ?? 'localhost:19092').split(',')) {}

  private async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = new Kafka({ clientId: this.source, brokers: this.brokers }).producer();
      await this.producer.connect();
    }
    return this.producer;
  }

  async publish(event: DomainEvent): Promise<void> {
    const producer = await this.getProducer();
    await producer.send({ topic: 'commerce.domain-events', messages: [{ key: event.id, value: JSON.stringify(event), headers: { type: event.type } }] });
  }

  async disconnect(): Promise<void> {
    await this.producer?.disconnect();
  }
}

export const createEvent = <T>(type: string, source: string, data: T): DomainEvent<T> => ({
  id: crypto.randomUUID(),
  type,
  source,
  occurredAt: new Date().toISOString(),
  data
});
