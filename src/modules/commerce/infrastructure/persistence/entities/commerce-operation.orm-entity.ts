import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('commerce_operations')
@Check(
  'CHK_commerce_operations_status',
  `"status" IN ('started','completed')`,
)
@Unique('UQ_commerce_operations_scope', [
  'actorId',
  'operationType',
  'idempotencyKey',
])
export class CommerceOperationOrmEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'actor_id', type: 'uuid' }) actorId!: string;
  @Column({ name: 'operation_type', type: 'varchar', length: 64 }) operationType!: string;
  @Column({ name: 'idempotency_key', type: 'varchar', length: 128 }) idempotencyKey!: string;
  @Column({ name: 'request_fingerprint', type: 'char', length: 64 }) requestFingerprint!: string;
  @Column({ name: 'aggregate_id', type: 'uuid', nullable: true }) aggregateId!: string | null;
  @Column({ name: 'result_reference', type: 'uuid', nullable: true }) resultReference!: string | null;
  @Column({ type: 'varchar', length: 16, default: 'started' }) status!: 'started' | 'completed';
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'actor_id',
    foreignKeyConstraintName: 'FK_commerce_operations_actor',
  })
  private actorReference?: unknown;
}
