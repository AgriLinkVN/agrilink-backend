import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('contracts')
@Check('CHK_contracts_quantity', '"quantity" > 0')
@Check(
  'CHK_contracts_total',
  '"unit_price" >= 0 AND "total_value" = "quantity" * "unit_price"',
)
@Check(
  'CHK_contracts_status',
  `"status" IN ('draft','negotiating','pending_signature','active','completed','cancelled')`,
)
@Index('IDX_contracts_purchase_request', ['purchaseRequestId'])
export class ContractOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'contract_code', type: 'varchar', length: 32, unique: true }) contractCode!: string;
  @Column({ name: 'purchase_request_id', type: 'uuid', nullable: true }) purchaseRequestId!: string | null;
  @Column({ name: 'buyer_id', type: 'uuid' }) buyerId!: string;
  @Column({ name: 'seller_id', type: 'uuid' }) sellerId!: string;
  @Column({ name: 'product_category_id', type: 'uuid', nullable: true }) productCategoryId!: string | null;
  @Column({ type: 'numeric', precision: 15, scale: 3 }) quantity!: string;
  @Column({ type: 'varchar', length: 32 }) unit!: string;
  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 0 }) unitPrice!: string;
  @Column({ name: 'total_value', type: 'numeric', precision: 18, scale: 0 }) totalValue!: string;
  @Column({ type: 'varchar', length: 32, default: 'draft' }) status!: string;
  @Column({ name: 'buyer_signed_at', type: 'timestamptz', nullable: true }) buyerSignedAt!: Date | null;
  @Column({ name: 'seller_signed_at', type: 'timestamptz', nullable: true }) sellerSignedAt!: Date | null;
  @VersionColumn({ default: 1 }) version!: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;

  @ManyToOne('PurchaseRequestOrmEntity', {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'purchase_request_id',
    foreignKeyConstraintName: 'FK_contracts_request',
  })
  private purchaseRequestReference?: unknown;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'buyer_id',
    foreignKeyConstraintName: 'FK_contracts_buyer',
  })
  private buyerReference?: unknown;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'seller_id',
    foreignKeyConstraintName: 'FK_contracts_seller',
  })
  private sellerReference?: unknown;

  @ManyToOne('ProductCategory', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'product_category_id',
    foreignKeyConstraintName: 'FK_contracts_category',
  })
  private categoryReference?: unknown;
}
