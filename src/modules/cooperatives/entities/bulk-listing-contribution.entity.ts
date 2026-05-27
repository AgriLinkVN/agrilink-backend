import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ProductUnit } from '../../../common/enums';

@Entity('bulk_listing_contributions')
export class BulkListingContribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → bulk_listings.id */
  @Column({ name: 'bulk_listing_id' })
  bulkListingId: string;

  /** FK → users.id (the contributing farmer) */
  @Column({ name: 'farmer_id' })
  farmerId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
