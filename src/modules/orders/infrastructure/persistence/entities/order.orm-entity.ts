import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('orders')
@Check(
  'CHK_orders_status',
  `"status" IN ('pending','confirmed','preparing','handed_to_logistics','shipping','delivered','cancelled')`,
)
@Check(
  'CHK_orders_method',
  `"payment_method" IN ('cod','bank_transfer','manual')`,
)
@Check(
  'CHK_orders_money',
  '"subtotal" >= 0 AND "shipping_fee" >= 0 AND "platform_fee" >= 0 AND "total_amount" = "subtotal" + "shipping_fee" + "platform_fee"',
)
@Index('IDX_orders_buyer_created', ['buyerId', 'createdAt'])
@Index('IDX_orders_seller_created', ['sellerId', 'createdAt'])
export class OrderOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'order_code', type: 'varchar', length: 32, unique: true }) orderCode!: string;
  @Column({ name: 'buyer_id', type: 'uuid' }) buyerId!: string;
  @Column({ name: 'seller_id', type: 'uuid' }) sellerId!: string;
  @Column({ type: 'varchar', length: 32, default: 'pending' }) status!: string;
  @Column({ name: 'subtotal', type: 'numeric', precision: 18, scale: 0 }) subtotal!: string;
  @Column({ name: 'shipping_fee', type: 'numeric', precision: 18, scale: 0, default: '0' }) shippingFee!: string;
  @Column({ name: 'platform_fee', type: 'numeric', precision: 18, scale: 0, default: '0' }) platformFee!: string;
  @Column({ name: 'total_amount', type: 'numeric', precision: 18, scale: 0 }) totalAmount!: string;
  @Column({ name: 'payment_method', type: 'varchar', length: 32 }) paymentMethod!: string;
  @Column({ name: 'shipping_address_id', type: 'uuid', nullable: true }) shippingAddressId!: string | null;
  @Column({ type: 'text', nullable: true }) note!: string | null;
  @Column({ name: 'cancelled_reason', type: 'text', nullable: true }) cancelledReason!: string | null;
  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true }) deliveredAt!: Date | null;
  @VersionColumn({ default: 1 }) version!: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'buyer_id',
    foreignKeyConstraintName: 'FK_orders_buyer',
  })
  private buyerReference?: unknown;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'seller_id',
    foreignKeyConstraintName: 'FK_orders_seller',
  })
  private sellerReference?: unknown;
}
