import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProductUnit, FarmingType } from '../../common/enums';

@Entity('purchase_requests')
export class PurchaseRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'enterprise_id', type: 'uuid' })
  enterpriseId: string;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ name: 'quantity_needed', type: 'decimal', precision: 15, scale: 2 })
  quantityNeeded: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ name: 'quality_standard', type: 'text', nullable: true })
  qualityStandard: string | null;

  @Column({ name: 'farming_type', type: 'enum', enum: FarmingType, nullable: true })
  farmingType: FarmingType | null;

  @Column({ name: 'province_id', type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ type: 'date', nullable: true })
  deadline: string | null;

  @Column({ length: 50, default: 'open' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
