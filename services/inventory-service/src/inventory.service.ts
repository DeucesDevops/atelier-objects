import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createEvent, KafkaEventPublisher } from '@commerce/events';
import { DataSource, Repository } from 'typeorm';
import { InventoryItem, Reservation } from './inventory.entities';

type ReservationRequest = { orderId: string; items: Array<{ sku: string; quantity: number }> };

@Injectable()
export class InventoryService implements OnModuleInit {
  private readonly events = new KafkaEventPublisher('inventory-service');
  constructor(@InjectRepository(InventoryItem) private readonly stock: Repository<InventoryItem>, private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (process.env.SEED_DEMO !== 'true') return;
    for (const sku of ['KEYBOARD-001', 'HEADPHONES-001', 'SPEAKER-001', 'MOUSE-001', 'LAMP-001', 'DESKMAT-001']) {
      if (!await this.stock.existsBy({ sku })) await this.setStock(sku, 24);
    }
  }

  list() { return this.stock.find({ order: { sku: 'ASC' } }); }

  async setStock(sku: string, quantity: number) {
    const normalized = sku.toUpperCase();
    let item = await this.stock.findOneBy({ sku: normalized });
    item = this.stock.create({ ...(item ?? {}), sku: normalized, available: quantity });
    return this.stock.save(item);
  }

  async reserve(request: ReservationRequest) {
    const reservations = await this.dataSource.transaction(async manager => {
      const result: Reservation[] = [];
      for (const requested of request.items) {
        const sku = requested.sku.toUpperCase();
        const item = await manager.findOne(InventoryItem, { where: { sku }, lock: { mode: 'pessimistic_write' } });
        if (!item || item.available < requested.quantity) throw new BadRequestException(`Insufficient inventory for ${sku}`);
        item.available -= requested.quantity; item.reserved += requested.quantity;
        await manager.save(item);
        result.push(await manager.save(Reservation, manager.create(Reservation, { orderId: request.orderId, sku, quantity: requested.quantity })));
      }
      return result;
    });
    await this.publish('inventory.reserved', { orderId: request.orderId, reservations });
    return { orderId: request.orderId, status: 'RESERVED', reservations };
  }

  async release(orderId: string) {
    const released = await this.dataSource.transaction(async manager => {
      const reservations = await manager.find(Reservation, { where: { orderId, status: 'ACTIVE' } });
      if (!reservations.length) throw new NotFoundException('Active reservation not found');
      for (const reservation of reservations) {
        const item = await manager.findOne(InventoryItem, { where: { sku: reservation.sku }, lock: { mode: 'pessimistic_write' } });
        if (!item) throw new NotFoundException(`Inventory item ${reservation.sku} not found`);
        item.available += reservation.quantity; item.reserved -= reservation.quantity;
        reservation.status = 'RELEASED';
        await manager.save([item, reservation]);
      }
      return reservations;
    });
    await this.publish('inventory.released', { orderId, reservations: released });
    return { orderId, status: 'RELEASED' };
  }

  private async publish(type: string, data: unknown) {
    try { await this.events.publish(createEvent(type, 'inventory-service', data)); } catch { /* broker recovery is independent */ }
  }
}
