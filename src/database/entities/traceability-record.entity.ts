import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('traceability_records')
export class TraceabilityRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ name: 'order_item_id', type: 'uuid', nullable: true })
  orderItemId: string | null;

  @Column({ name: 'qr_code', length: 100, unique: true })
  qrCode: string;

  @Column({ name: 'batch_code', length: 100, nullable: true })
  batchCode: string | null;

  @Column({ name: 'planting_date', type: 'date', nullable: true })
  plantingDate: string | null;

  @Column({ name: 'harvest_date', type: 'date', nullable: true })
  harvestDate: string | null;

  @Column({ name: 'seed_variety', length: 100, nullable: true })
  seedVariety: string | null;

  @Column({ name: 'fertilizers_used', type: 'text', nullable: true })
  fertilizersUsed: string | null;

  @Column({ name: 'pesticides_used', type: 'text', nullable: true })
  pesticidesUsed: string | null;

  @Column({ name: 'storage_conditions', type: 'text', nullable: true })
  storageConditions: string | null;

  @Column({ name: 'processing_method', type: 'text', nullable: true })
  processingMethod: string | null;

  @Column({ name: 'quality_test_result', type: 'text', nullable: true })
  qualityTestResult: string | null;

  @Column({ name: 'quality_test_lab', length: 255, nullable: true })
  qualityTestLab: string | null;

  @Column({ name: 'quality_test_url', type: 'text', nullable: true })
  qualityTestUrl: string | null;

  @Column({ name: 'issued_at', type: 'timestamptz', default: () => 'now()' })
  issuedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
