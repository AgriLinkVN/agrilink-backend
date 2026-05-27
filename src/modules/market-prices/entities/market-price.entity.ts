import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ProductUnit } from '../../../common/enums';

@Entity('market_prices')
export class MarketPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → products category or a generic product name */
  @Column({ name: 'product_name' })
  productName: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  /** FK → provinces.id */
  @Column({ name: 'province_id', nullable: true })
  provinceId: string;

  @Column({ name: 'price_per_unit', type: 'decimal', precision: 12, scale: 2 })
  pricePerUnit: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  /** Source: state agency, market, cooperative, etc. */
  @Column({ nullable: true })
  source: string;

  /** FK → users.id (reporter) */
  @Column({ name: 'reported_by', nullable: true })
  reportedBy: string;

  @Column({ name: 'price_date', type: 'date' })
  priceDate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
