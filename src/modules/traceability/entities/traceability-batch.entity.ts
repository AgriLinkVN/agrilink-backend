import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('traceability_batches')
export class TraceabilityBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'producer_id', type: 'uuid' })
  producerId: string;

  @Column({ name: 'batch_code', length: 100, unique: true })
  batchCode: string;

  @Column({ name: 'qr_code', length: 100, unique: true })
  qrCode: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
