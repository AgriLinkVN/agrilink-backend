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

@Entity('payments')
@Check('CHK_payments_currency', `"currency" = 'VND'`)
@Check(
  'CHK_payments_method',
  `"method" IN ('cod','bank_transfer','manual')`,
)
@Check(
  'CHK_payments_status',
  `"status" IN ('unpaid','paid','partially_refunded','refunded')`,
)
@Check(
  'CHK_payments_refund',
  '"amount" >= 0 AND "refunded_amount" >= 0 AND "refunded_amount" <= "amount"',
)
export class PaymentOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'order_id', type: 'uuid', unique: true }) orderId!: string;
  @Column({ type: 'numeric', precision: 18, scale: 0 }) amount!: string;
  @Column({ type: 'varchar', length: 3, default: 'VND' }) currency!: string;
  @Column({ type: 'varchar', length: 32 }) method!: string;
  @Column({ type: 'varchar', length: 32, default: 'unpaid' }) status!: string;
  @Column({ name: 'refunded_amount', type: 'numeric', precision: 18, scale: 0, default: '0' }) refundedAmount!: string;
  @VersionColumn({ default: 1 }) version!: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;

  @ManyToOne('OrderOrmEntity', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'FK_payments_order',
  })
  private orderReference?: unknown;
}
