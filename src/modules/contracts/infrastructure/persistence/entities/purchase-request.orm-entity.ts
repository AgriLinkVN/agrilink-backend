import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('purchase_requests')
@Check('CHK_purchase_requests_quantity', '"quantity_needed" > 0')
@Check(
  'CHK_purchase_requests_status',
  `"status" IN ('open','closed','cancelled')`,
)
export class PurchaseRequestOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'buyer_id', type: 'uuid' }) buyerId!: string;
  @Column({ name: 'product_category_id', type: 'uuid', nullable: true }) productCategoryId!: string | null;
  @Column({ name: 'province_id', type: 'uuid', nullable: true }) provinceId!: string | null;
  @Column({ name: 'quantity_needed', type: 'numeric', precision: 15, scale: 3 }) quantityNeeded!: string;
  @Column({ type: 'varchar', length: 32 }) unit!: string;
  @Column({ type: 'varchar', length: 32, default: 'open' }) status!: string;
  @VersionColumn({ default: 1 }) version!: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'buyer_id',
    foreignKeyConstraintName: 'FK_purchase_requests_buyer',
  })
  private buyerReference?: unknown;

  @ManyToOne('ProductCategory', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'product_category_id',
    foreignKeyConstraintName: 'FK_purchase_requests_category',
  })
  private categoryReference?: unknown;

  @ManyToOne('Province', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'province_id',
    foreignKeyConstraintName: 'FK_purchase_requests_province',
  })
  private provinceReference?: unknown;
}
