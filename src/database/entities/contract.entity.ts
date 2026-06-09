import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProductUnit, ContractStatus } from '../../common/enums';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_code', length: 50, unique: true })
  contractCode: string;

  @Column({ name: 'buyer_id', type: 'uuid' })
  buyerId: string;

  @Column({ name: 'seller_id', type: 'uuid' })
  sellerId: string;

  @Column({ name: 'bulk_listing_id', type: 'uuid', nullable: true })
  bulkListingId: string | null;

  @Column({ name: 'product_category_id', type: 'int', nullable: true })
  productCategoryId: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  quantity: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ name: 'total_value', type: 'decimal', precision: 15, scale: 2 })
  totalValue: number;

  @Column({ name: 'quality_standards', type: 'text', nullable: true })
  qualityStandards: string | null;

  @Column({ name: 'delivery_deadline', type: 'date', nullable: true })
  deliveryDeadline: string | null;

  @Column({ name: 'payment_terms', type: 'text', nullable: true })
  paymentTerms: string | null;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status: ContractStatus;

  @Column({ name: 'buyer_signed_at', type: 'timestamptz', nullable: true })
  buyerSignedAt: Date | null;

  @Column({ name: 'seller_signed_at', type: 'timestamptz', nullable: true })
  sellerSignedAt: Date | null;

  @Column({ name: 'content_url', type: 'text', nullable: true })
  contentUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
