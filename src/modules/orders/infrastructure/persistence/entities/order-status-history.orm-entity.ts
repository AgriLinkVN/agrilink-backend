import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('order_status_history')
@Unique('UQ_order_status_history_operation', ['orderId', 'operationKey'])
@Index('IDX_order_history_order_created', ['orderId', 'createdAt'])
export class OrderStatusHistoryOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'order_id', type: 'uuid' }) orderId!: string;
  @Column({ name: 'from_status', type: 'varchar', length: 32, nullable: true }) fromStatus!: string | null;
  @Column({ name: 'to_status', type: 'varchar', length: 32 }) toStatus!: string;
  @Column({ name: 'changed_by', type: 'uuid', nullable: true }) changedBy!: string | null;
  @Column({ type: 'text', nullable: true }) note!: string | null;
  @Column({ name: 'operation_key', type: 'varchar', length: 128 }) operationKey!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;

  @ManyToOne('OrderOrmEntity', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'FK_order_status_history_order',
  })
  private orderReference?: unknown;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'changed_by',
    foreignKeyConstraintName: 'FK_order_status_history_actor',
  })
  private actorReference?: unknown;
}
