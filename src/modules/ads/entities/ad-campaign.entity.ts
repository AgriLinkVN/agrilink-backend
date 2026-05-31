import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdStatus } from '../../../common/enums';
import { AdPackage } from './ad-package.entity';
import { AdEvent } from './ad-event.entity';

/**
 * Matches SQL schema: ad_campaigns
 *   id                 UUID PK
 *   supplier_id        UUID FK → users.id   (NOT advertiser_id)
 *   package_id         INT  FK → ad_packages.id
 *   title              VARCHAR(255)
 *   image_url          TEXT                 (NOT banner_url)
 *   link_url           TEXT                 (NOT target_url)
 *   target_provinces   JSONB                (kept JSONB from migration, SQL doc said text)
 *   status             ad_status
 *   approved_by        UUID
 *   approved_at        TIMESTAMPTZ
 *   rejection_reason   TEXT
 *   start_date         DATE                 (NOT starts_at TIMESTAMPTZ)
 *   end_date           DATE                 (NOT ends_at)
 *   total_impressions  INTEGER              (NOT impression_count)
 *   total_clicks       INTEGER              (NOT click_count)
 *   created_at         TIMESTAMPTZ
 */
@Entity('ad_campaigns')
export class AdCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id (the supplier who owns this campaign) */
  @Column({ name: 'supplier_id' })
  supplierId: string;

  /** FK → ad_packages.id (INT) */
  @Column({ name: 'package_id', type: 'int' })
  packageId: number;

  @Column({ length: 255 })
  title: string;

  /** Cloudinary image URL for the banner */
  @Column({ name: 'image_url', nullable: true, type: 'text' })
  imageUrl: string;

  /** Destination URL when the banner is clicked */
  @Column({ name: 'link_url', nullable: true, type: 'text' })
  linkUrl: string;

  /** Array of province IDs targeted by this campaign. Empty = nationwide. */
  @Column({
    name: 'target_provinces',
    type: 'jsonb',
    nullable: true,
    default: () => "'[]'::jsonb",
  })
  targetProvinces: number[];

  @Column({ type: 'enum', enum: AdStatus, default: AdStatus.pending_approval })
  status: AdStatus;

  /** FK → users.id (admin who approved/rejected) */
  @Column({ name: 'approved_by', nullable: true })
  approvedById: string;

  @Column({ name: 'approved_at', nullable: true, type: 'timestamptz' })
  approvedAt: Date;

  @Column({ name: 'rejection_reason', nullable: true, type: 'text' })
  rejectionReason: string;

  /** Date the campaign starts running (date-only per SQL doc) */
  @Column({ name: 'start_date', nullable: true, type: 'date' })
  startDate: Date | string;

  @Column({ name: 'end_date', nullable: true, type: 'date' })
  endDate: Date | string;

  @Column({ name: 'total_impressions', default: 0 })
  totalImpressions: number;

  @Column({ name: 'total_clicks', default: 0 })
  totalClicks: number;

  // ── Relations ─────────────────────────────────────────────────────────────

  @ManyToOne(() => AdPackage, { onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'package_id' })
  package: AdPackage;

  @OneToMany(() => AdEvent, (event) => event.campaign, { cascade: false })
  events: AdEvent[];

  // ── Timestamps ────────────────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
