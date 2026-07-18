import { FarmingType, ProductStatus, ProductUnit, SellerType } from '@common/enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductImage } from './product-image.entity';
import { ProductCertification } from './product-certification.entity';
import { ProductCategory } from './product-category.entity';


@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ name: 'seller_type', type: 'enum', enum: SellerType })
  sellerType: SellerType;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ length: 50, unique: true, nullable: true })
  sku: string;

  @Column({ length: 100, nullable: true })
  variety: string;

  @Column({ name: 'price_per_unit', type: 'decimal', precision: 12, scale: 2 })
  pricePerUnit: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ name: 'available_quantity', type: 'decimal', precision: 12, scale: 2, default: 0 })
  availableQuantity: number;

  @Column({ name: 'min_order_quantity', type: 'decimal', precision: 12, scale: 2, nullable: true })
  minOrderQuantity: number;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @Column({ name: 'farming_type', type: 'enum', enum: FarmingType, nullable: true })
  farmingType: FarmingType;

  @Column({ name: 'province_id', nullable: true })
  provinceId: string;

  @Column({ name: 'district_id', nullable: true })
  districtId: string;

  @Column({ name: 'farm_latitude', type: 'float', nullable: true })
  farmLatitude: number;

  @Column({ name: 'farm_longitude', type: 'float', nullable: true })
  farmLongitude: number;

  @Column({ name: 'harvest_date', nullable: true, type: 'date' })
  harvestDate: Date;

  @Column({ name: 'expiry_date', nullable: true, type: 'date' })
  expiryDate: Date;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'sold_count', type: 'float', default: 0 })
  soldCount: number;

  @Column({ name: 'avg_rating', type: 'float', default: 0 })
  avgRating: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Relations ────────────────────────────────────────────────
  @ManyToOne(() => ProductCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: ProductCategory;

  @OneToMany(() => ProductImage, (img) => img.product, { cascade: true })
  images: ProductImage[];

  @OneToMany(() => ProductCertification, (cert) => cert.product, { cascade: true })
  certifications: ProductCertification[];
}