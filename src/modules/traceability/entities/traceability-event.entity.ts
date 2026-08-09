import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('traceability_events')
export class TraceabilityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id', type: 'uuid' })
  batchId: string;

  @Column({ type: 'integer' })
  sequence: number;

  @Column({ name: 'event_kind', length: 64 })
  eventKind: string;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'evidence_file_ids', type: 'uuid', array: true, default: () => "'{}'" })
  evidenceFileIds: string[];

  @Column({ name: 'operation_key', length: 128, unique: true })
  operationKey: string;

  @Column({ name: 'supersedes_event_id', type: 'uuid', nullable: true })
  supersedesEventId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
