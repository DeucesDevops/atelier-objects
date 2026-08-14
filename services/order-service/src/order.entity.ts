import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type OrderItem = { sku: string; quantity: number; unitPrice: number };

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() userId!: string;
  @Column() customerEmail!: string;
  @Column({ type: 'jsonb' }) items!: OrderItem[];
  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } }) total!: number;
  @Column({ default: 'PENDING' }) status!: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';
  @Column({ nullable: true }) paymentId?: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
