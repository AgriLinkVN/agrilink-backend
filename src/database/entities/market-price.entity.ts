import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ProductUnit } from '../../common/enums';

@Entity('market_prices')
export class MarketPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'category_id', type: 'int' })
  categoryId: number;

  @Column({ name: 'province_id', type: 'int' })
  provinceId: number;

  @Column({ name: 'price_date', type: 'date' })
  priceDate: string;

  @Column({ name: 'min_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  minPrice: number | null;

  @Column({ name: 'max_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxPrice: number | null;

  @Column({ name: 'avg_price', type: 'decimal', precision: 15, scale: 2 })
  avgPrice: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ length: 100, nullable: true })
  source: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
