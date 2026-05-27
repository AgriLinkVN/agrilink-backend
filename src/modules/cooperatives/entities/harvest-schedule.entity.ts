import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProductUnit } from '../../../common/enums';

@Entity('harvest_schedules')
export class HarvestSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id (farmer or cooperative) */
  @Column({ name: 'user_id' })
  userId: string;

  /** FK → products.id (optional — can be for a general crop) */
  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @Column({ name: 'crop_name' })
  cropName: string;

  @Column({ name: 'expected_harvest_date', type: 'date' })
  expectedHarvestDate: Date;

  @Column({ name: 'estimated_quantity', type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedQuantity: number;

  @Column({ type: 'enum', enum: ProductUnit, nullable: true })
  unit: ProductUnit;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
