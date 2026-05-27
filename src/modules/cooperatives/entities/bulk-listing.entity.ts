import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProductUnit } from '../../../common/enums';

@Entity('bulk_listings')
export class BulkListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id (cooperative) */
  @Column({ name: 'cooperative_id' })
  cooperativeId: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'product_category_id', nullable: true })
  productCategoryId: string;

  @Column({ name: 'total_quantity', type: 'decimal', precision: 12, scale: 2 })
  totalQuantity: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ name: 'price_per_unit', type: 'decimal', precision: 12, scale: 2 })
  pricePerUnit: number;

  @Column({ name: 'deadline', type: 'timestamptz', nullable: true })
  deadline: Date;

  @Column({ name: 'is_open', default: true })
  isOpen: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
