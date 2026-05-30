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

@Entity('ad_campaigns')
export class AdCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id (the supplier who owns this campaign) */
  @Column({ name: 'advertiser_id' })
  advertiserId: string;

  /** FK → ad_packages.id */
  @Column({ name: 'package_id' })
  packageId: string;

  @Column()
  title: string;

  /** Cloudinary image URL for the banner */
  @Column({ name: 'banner_url', nullable: true, type: 'text' })
  bannerUrl: string;

  /** Destination URL when the banner is clicked */
  @Column({ name: 'target_url', nullable: true, type: 'text' })
  targetUrl: string;

  /** Array of province IDs targeted by this campaign. Empty/null = nationwide. */
  @Column({ name: 'target_provinces', nullable: true, type: 'jsonb', default: () => "'[]'::jsonb" })
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

  @Column({ name: 'starts_at', nullable: true, type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', nullable: true, type: 'timestamptz' })
  endsAt: Date;

  @Column({ name: 'impression_count', default: 0 })
  impressionCount: number;

  @Column({ name: 'click_count', default: 0 })
  clickCount: number;

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
