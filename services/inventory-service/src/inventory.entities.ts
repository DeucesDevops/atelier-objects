import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) sku!: string;
  @Column({ type: 'int', default: 0 }) available!: number;
  @Column({ type: 'int', default: 0 }) reserved!: number;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() orderId!: string;
  @Column() sku!: string;
  @Column({ type: 'int' }) quantity!: number;
  @Column({ default: 'ACTIVE' }) status!: 'ACTIVE' | 'RELEASED';
  @CreateDateColumn() createdAt!: Date;
}
