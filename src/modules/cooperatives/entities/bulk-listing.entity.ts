import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  FarmingType,
  ProductStatus,
  ProductUnit,
} from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { BulkListingContribution } from './bulk-listing-contribution.entity';

const numericTransformer = {
  to: (v?: number) => v,
  from: (v?: string | null) => (v == null ? 0 : parseFloat(v)),
};

/**
 * Matches SQL schema: bulk_listings
 *   id                 UUID PK
 *   cooperative_id     UUID FK → users.id
 *   category_id        INT  FK → product_categories.id
 *   title              VARCHAR(255)
 *   description        TEXT
 *   total_quantity     NUMERIC
 *   unit               product_unit
 *   price_per_unit     NUMERIC
 *   farming_type       farming_type
 *   province_id        INT  FK → provinces.id
 *   harvest_date_from  DATE
 *   harvest_date_to    DATE
 *   status             product_status (draft/pending_approval/active/...)
 *   created_at/updated_at
 */
@Entity('bulk_listings')
@Index('idx_bulk_status_dates', ['status', 'harvestDateFrom', 'harvestDateTo'])
@Index('idx_bulk_coop', ['cooperativeId', 'createdAt'])
export class BulkListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id (cooperative owner) */
  @Column({ name: 'cooperative_id' })
  cooperativeId: string;

  /**
   * FK → product_categories.id.
   * NOTE: SQL doc says INT, but the actual P2 ProductCategory entity uses UUID.
   * We align with P2's runtime contract so the FK constraint succeeds.
   */
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ length: 255 })
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({
    name: 'total_quantity',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  totalQuantity: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({
    name: 'price_per_unit',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  pricePerUnit: number;

  @Column({ name: 'farming_type', type: 'enum', enum: FarmingType, nullable: true })
  farmingType: FarmingType | null;

  @Column({ name: 'province_id', type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ name: 'harvest_date_from', type: 'date', nullable: true })
  harvestDateFrom: string | null;

  @Column({ name: 'harvest_date_to', type: 'date', nullable: true })
  harvestDateTo: string | null;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.draft })
  status: ProductStatus;

  // ── Relations ─────────────────────────────────────────────────────────────

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cooperative_id' })
  cooperative: User;

  @OneToMany(() => BulkListingContribution, (c) => c.bulkListing)
  contributions: BulkListingContribution[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
