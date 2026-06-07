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
import { ProductUnit } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { BulkListing } from './bulk-listing.entity';

const numericTransformer = {
  to: (v?: number) => v,
  from: (v?: string | null) => (v == null ? 0 : parseFloat(v)),
};

/**
 * Matches SQL schema: bulk_listing_contributions
 *   id               UUID PK
 *   bulk_listing_id  UUID FK → bulk_listings.id
 *   farmer_id        UUID FK → users.id
 *   product_id       UUID FK → products.id (optional — if matched to a SKU)
 *   quantity         NUMERIC
 *   unit             product_unit
 *   created_at       TIMESTAMPTZ
 *
 * Unique (bulk_listing_id, farmer_id) — one contribution per farmer per listing.
 */
@Entity('bulk_listing_contributions')
@Unique('uq_contrib_listing_farmer', ['bulkListingId', 'farmerId'])
@Index('idx_contrib_listing', ['bulkListingId'])
export class BulkListingContribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → bulk_listings.id */
  @Column({ name: 'bulk_listing_id' })
  bulkListingId: string;

  /** FK → users.id (the contributing farmer) */
  @Column({ name: 'farmer_id' })
  farmerId: string;

  /** FK → products.id (optional — null if not tied to a specific SKU) */
  @Column({ name: 'product_id', nullable: true })
  productId: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  quantity: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  // ── Relations ─────────────────────────────────────────────────────────────

  @ManyToOne(() => BulkListing, (b) => b.contributions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bulk_listing_id' })
  bulkListing: BulkListing;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmer_id' })
  farmer: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
