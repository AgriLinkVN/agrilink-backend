import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProductUnit, FarmingType, ProductStatus } from '../../common/enums';

@Entity('bulk_listings')
export class BulkListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cooperative_id', type: 'uuid' })
  cooperativeId: string;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'total_quantity', type: 'decimal', precision: 15, scale: 2 })
  totalQuantity: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ name: 'price_per_unit', type: 'decimal', precision: 15, scale: 2 })
  pricePerUnit: number;

  @Column({ name: 'farming_type', type: 'enum', enum: FarmingType, nullable: true })
  farmingType: FarmingType | null;

  @Column({ name: 'province_id', type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ name: 'harvest_date_from', type: 'date', nullable: true })
  harvestDateFrom: string | null;

  @Column({ name: 'harvest_date_to', type: 'date', nullable: true })
  harvestDateTo: string | null;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
