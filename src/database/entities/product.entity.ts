import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SellerType, FarmingType, ProductUnit, ProductStatus } from '../../common/enums';
import { User } from './user.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id', type: 'uuid' })
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ name: 'seller_type', type: 'enum', enum: SellerType })
  sellerType: SellerType;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ length: 50, unique: true, nullable: true })
  sku: string | null;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 100, nullable: true })
  variety: string | null;

  @Column({ name: 'farming_type', type: 'enum', enum: FarmingType })
  farmingType: FarmingType;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: number;

  @Column({ name: 'min_order_quantity', type: 'decimal', precision: 10, scale: 2, default: 1 })
  minOrderQuantity: number;

  @Column({ name: 'stock_quantity', type: 'decimal', precision: 10, scale: 2, default: 0 })
  stockQuantity: number;

  @Column({ name: 'province_id', type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ name: 'district_id', type: 'int', nullable: true })
  districtId: number | null;

  @Column({ name: 'farm_latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  farmLatitude: number | null;

  @Column({ name: 'farm_longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  farmLongitude: number | null;

  @Column({ name: 'harvest_date', type: 'date', nullable: true })
  harvestDate: string | null;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'sold_count', type: 'decimal', precision: 10, scale: 2, default: 0 })
  soldCount: number;

  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  avgRating: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
