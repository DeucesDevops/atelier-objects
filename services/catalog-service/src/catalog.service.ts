import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createEvent, KafkaEventPublisher } from '@commerce/events';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { Product } from './product.entity';

type ProductInput = Pick<Product, 'sku' | 'name' | 'description' | 'price' | 'active'>;

@Injectable()
export class CatalogService implements OnModuleInit {
  private readonly cache = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1 });
  private readonly events = new KafkaEventPublisher('catalog-service');
  constructor(@InjectRepository(Product) private readonly products: Repository<Product>) {}

  async onModuleInit() {
    if (process.env.SEED_DEMO !== 'true') return;
    const demoProducts: ProductInput[] = [
      { sku: 'KEYBOARD-001', name: 'Form 75 Keyboard', description: 'A hot-swappable mechanical keyboard with a solid aluminium frame', price: 129.99, active: true },
      { sku: 'HEADPHONES-001', name: 'Studio Headphones', description: 'Closed-back wireless headphones tuned for detail and long listening', price: 189.00, active: true },
      { sku: 'SPEAKER-001', name: 'Arc Wireless Speaker', description: 'Room-filling wireless sound in a sculptural, compact form', price: 219.00, active: true },
      { sku: 'MOUSE-001', name: 'Contour Precision Mouse', description: 'A quiet ergonomic mouse with glass-ready tracking', price: 79.00, active: true },
      { sku: 'LAMP-001', name: 'Halo Task Light', description: 'Low-glare desk lighting with warm-to-cool touch dimming', price: 149.00, active: true },
      { sku: 'DESKMAT-001', name: 'Wool Desk Mat', description: 'Recycled wool felt with a naturally grippy cork backing', price: 49.00, active: true }
    ];
    for (const demoProduct of demoProducts) {
      const existing = await this.products.findOneBy({ sku: demoProduct.sku });
      if (!existing) await this.create(demoProduct);
      else await this.products.save(Object.assign(existing, demoProduct));
    }
  }

  list() { return this.products.find({ order: { name: 'ASC' } }); }
  async get(id: string) {
    try {
      if (this.cache.status === 'wait') await this.cache.connect();
      const cached = await this.cache.get(`product:${id}`);
      if (cached) return JSON.parse(cached) as Product;
    } catch { /* cache miss */ }
    const product = await this.products.findOneBy({ id });
    if (!product) throw new NotFoundException('Product not found');
    try { await this.cache.set(`product:${id}`, JSON.stringify(product), 'EX', 60); } catch { /* cache is optional */ }
    return product;
  }
  async create(input: ProductInput) {
    const product = await this.products.save(this.products.create({ ...input, sku: input.sku.toUpperCase() }));
    await this.publish('catalog.product.created', product);
    return product;
  }
  async update(id: string, input: Partial<ProductInput>) {
    const product = await this.get(id);
    Object.assign(product, input, input.sku ? { sku: input.sku.toUpperCase() } : {});
    const saved = await this.products.save(product);
    try { await this.cache.del(`product:${id}`); } catch { /* cache is optional */ }
    await this.publish('catalog.product.updated', saved);
    return saved;
  }
  async remove(id: string) {
    const product = await this.get(id);
    await this.products.remove(product);
    try { await this.cache.del(`product:${id}`); } catch { /* cache is optional */ }
    await this.publish('catalog.product.deleted', { id, sku: product.sku });
  }
  private async publish(type: string, data: unknown) {
    try { await this.events.publish(createEvent(type, 'catalog-service', data)); } catch { /* keep CRUD available during broker startup */ }
  }
}
