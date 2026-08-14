import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) sku!: string;
  @Column() name!: string;
  @Column({ default: '' }) description!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } }) price!: number;
  @Column({ default: true }) active!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
