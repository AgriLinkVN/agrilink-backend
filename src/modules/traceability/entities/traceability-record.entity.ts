import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('traceability_records')
export class TraceabilityRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → products.id */
  @Column({ name: 'product_id' })
  productId: string;

  /** Unique QR code string — scan this to retrieve the record */
  @Column({ name: 'qr_code', unique: true })
  qrCode: string;

  /** FK → users.id (farmer/cooperative who produced this batch) */
  @Column({ name: 'producer_id' })
  producerId: string;

  @Column({ name: 'farm_location', nullable: true })
  farmLocation: string;

  @Column({ name: 'farming_method', nullable: true })
  farmingMethod: string;

  @Column({ name: 'planted_date', nullable: true, type: 'date' })
  plantedDate: Date;

  @Column({ name: 'harvested_date', nullable: true, type: 'date' })
  harvestedDate: Date;

  @Column({ name: 'pesticides_used', nullable: true, type: 'text' })
  pesticidesUsed: string;

  @Column({ name: 'certifications', nullable: true, type: 'jsonb' })
  certifications: object;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
