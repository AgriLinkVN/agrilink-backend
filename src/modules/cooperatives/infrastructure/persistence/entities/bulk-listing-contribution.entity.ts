import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bulk_listing_contributions')
export class BulkListingContributionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bulk_listing_id', type: 'uuid' })
  bulkListingId: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmerId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: string;

  @Column({ type: 'varchar', length: 20 })
  unit: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
