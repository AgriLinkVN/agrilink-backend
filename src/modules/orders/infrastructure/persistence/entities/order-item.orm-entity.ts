import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('order_items')
@Check('CHK_order_items_quantity', '"quantity" > 0')
@Check(
  'CHK_order_items_money',
  '"unit_price" >= 0 AND "line_total" = "quantity" * "unit_price"',
)
@Index('IDX_order_items_order', ['orderId'])
export class OrderItemOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'order_id', type: 'uuid' }) orderId!: string;
  @Column({ name: 'product_id', type: 'uuid' }) productId!: string;
  @Column({ name: 'product_name', type: 'varchar', length: 255 }) productName!: string;
  @Column({ type: 'numeric', precision: 15, scale: 3 }) quantity!: string;
  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 0 }) unitPrice!: string;
  @Column({ name: 'line_total', type: 'numeric', precision: 18, scale: 0 }) lineTotal!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;

  @ManyToOne('OrderOrmEntity', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'FK_order_items_order',
  })
  private orderReference?: unknown;

  @ManyToOne('Product', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'product_id',
    foreignKeyConstraintName: 'FK_order_items_product',
  })
  private productReference?: unknown;
}
