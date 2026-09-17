import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { TraceabilityEventKind } from "../application/traceability-projection";
import { TraceabilityBatch } from "./traceability-batch.entity";

@Entity("traceability_events")
@Unique("UQ_traceability_events_operation_key", ["operationKey"])
@Unique("UQ_traceability_events_batch_sequence", ["batchId", "sequence"])
@Index("IDX_traceability_events_batch_sequence", ["batchId", "sequence"])
@Check(
  "CHK_traceability_events_event_kind",
  `"event_kind" IN ('BATCH_CREATED','PLANTED','HARVESTED','QUALITY_TESTED','SHIPPED','CORRECTED')`,
)
export class TraceabilityEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "batch_id", type: "uuid" })
  batchId: string;

  @ManyToOne(() => TraceabilityBatch, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({
    name: "batch_id",
    foreignKeyConstraintName: "FK_traceability_events_batch",
  })
  batch: TraceabilityBatch;

  @Column({ type: "integer" })
  sequence: number;

  @Column({ name: "event_kind", length: 64 })
  eventKind: TraceabilityEventKind;

  @Column({ name: "occurred_at", type: "timestamptz" })
  occurredAt: Date;

  @Column({ type: "jsonb" })
  payload: Record<string, unknown>;

  @Column({
    name: "evidence_file_ids",
    type: "uuid",
    array: true,
    default: () => "'{}'",
  })
  evidenceFileIds: string[];

  @Column({ name: "operation_key", length: 128 })
  operationKey: string;

  @Column({ name: "supersedes_event_id", type: "uuid", nullable: true })
  supersedesEventId: string | null;

  @ManyToOne(() => TraceabilityEvent, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({
    name: "supersedes_event_id",
    foreignKeyConstraintName: "FK_traceability_events_supersedes",
  })
  supersedesEvent: TraceabilityEvent | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
