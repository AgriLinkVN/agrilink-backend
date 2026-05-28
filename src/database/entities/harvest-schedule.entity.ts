import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProductUnit } from '../../common/enums';

@Entity('harvest_schedules')
export class HarvestSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cooperative_id', type: 'uuid' })
  cooperativeId: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmerId: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ name: 'expected_date', type: 'date' })
  expectedDate: string;

  @Column({ name: 'estimated_qty', type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedQty: number | null;

  @Column({ type: 'enum', enum: ProductUnit, nullable: true })
  unit: ProductUnit | null;

  @Column({ name: 'actual_date', type: 'date', nullable: true })
  actualDate: string | null;

  @Column({ name: 'actual_qty', type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualQty: number | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
