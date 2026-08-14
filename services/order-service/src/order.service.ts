import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { createEvent, KafkaEventPublisher } from '@commerce/events';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Order, OrderItem } from './order.entity';

type CreateOrder = { userId: string; customerEmail: string; items: OrderItem[]; paymentMethod: string };

@Injectable()
export class OrderService {
  private readonly inventoryUrl = process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3004';
  private readonly paymentUrl = process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:8085';
  private readonly events = new KafkaEventPublisher('order-service');
  constructor(@InjectRepository(Order) private readonly orders: Repository<Order>, private readonly http: HttpService) {}

  list(userId?: string) { return this.orders.find({ where: userId ? { userId } : {}, order: { createdAt: 'DESC' } }); }
  async get(id: string, userId?: string) { const order = await this.orders.findOneBy({ id }); if (!order || (userId && order.userId !== userId)) throw new NotFoundException('Order not found'); return order; }

  async create(input: CreateOrder) {
    const total = Number(input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2));
    let order = await this.orders.save(this.orders.create({ userId: input.userId, customerEmail: input.customerEmail, items: input.items, total, status: 'PENDING' }));
    try {
      await firstValueFrom(this.http.post(`${this.inventoryUrl}/reservations`, { orderId: order.id, items: input.items.map(({ sku, quantity }) => ({ sku, quantity })) }));
      const authorization = await firstValueFrom(this.http.post<{ id: string }>(`${this.paymentUrl}/authorizations`, { orderId: order.id, amount: total, currency: 'GBP', paymentMethod: input.paymentMethod }));
      await firstValueFrom(this.http.post(`${this.paymentUrl}/payments/${authorization.data.id}/capture`, {}));
      order.paymentId = authorization.data.id; order.status = 'CONFIRMED'; order = await this.orders.save(order);
      await this.publish('order.confirmed', order);
      return order;
    } catch (error) {
      order.status = 'FAILED'; await this.orders.save(order);
      try { await firstValueFrom(this.http.post(`${this.inventoryUrl}/reservations/${order.id}/release`, {})); } catch { /* nothing to release or inventory unavailable */ }
      await this.publish('order.failed', { orderId: order.id });
      throw new BadGatewayException('Order could not be completed; any inventory reservation was released');
    }
  }

  async updateStatus(id: string, userId: string, status: Order['status']) {
    const order = await this.get(id, userId); order.status = status; const saved = await this.orders.save(order);
    await this.publish('order.status.changed', { orderId: id, status }); return saved;
  }

  async cancel(id: string, userId: string) {
    const order = await this.get(id, userId);
    if (order.paymentId) await firstValueFrom(this.http.post(`${this.paymentUrl}/payments/${order.paymentId}/refund`, { amount: order.total }));
    try { await firstValueFrom(this.http.post(`${this.inventoryUrl}/reservations/${order.id}/release`, {})); } catch { /* reservation may already be released */ }
    order.status = 'CANCELLED'; const saved = await this.orders.save(order);
    await this.publish('order.cancelled', saved); return saved;
  }

  private async publish(type: string, data: unknown) { try { await this.events.publish(createEvent(type, 'order-service', data)); } catch { /* broker recovery is independent */ } }
}
