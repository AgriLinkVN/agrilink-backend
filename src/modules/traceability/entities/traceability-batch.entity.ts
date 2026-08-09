import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

@Entity("traceability_batches")
@Unique("UQ_traceability_batches_batch_code", ["batchCode"])
@Unique("UQ_traceability_batches_qr_code", ["qrCode"])
export class TraceabilityBatch {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "product_id", type: "uuid" })
  productId: string;

  @Column({ name: "producer_id", type: "uuid" })
  producerId: string;

  @Column({ name: "batch_code", length: 100 })
  batchCode: string;

  @Column({ name: "qr_code", length: 100 })
  qrCode: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
