import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AdStatus } from '../../../common/enums';

@Entity('ad_campaigns')
export class AdCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id (advertiser) */
  @Column({ name: 'advertiser_id' })
  advertiserId: string;

  /** FK → ad_packages.id */
  @Column({ name: 'package_id' })
  packageId: string;

  /** FK → products.id (optional — campaign may promote the whole store) */
  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @Column()
  title: string;

  @Column({ name: 'banner_url', nullable: true })
  bannerUrl: string;

  @Column({ name: 'target_url', nullable: true })
  targetUrl: string;

  @Column({ type: 'enum', enum: AdStatus, default: AdStatus.pending_approval })
  status: AdStatus;

  @Column({ name: 'starts_at', nullable: true, type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', nullable: true, type: 'timestamptz' })
  endsAt: Date;

  @Column({ name: 'impression_count', default: 0 })
  impressionCount: number;

  @Column({ name: 'click_count', default: 0 })
  clickCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
