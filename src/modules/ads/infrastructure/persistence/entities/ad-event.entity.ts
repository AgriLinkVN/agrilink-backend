import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdCampaign } from './ad-campaign.entity';

export enum AdEventType {
  IMPRESSION = 'impression',
  CLICK = 'click',
}

@Entity('ad_events')
export class AdEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → ad_campaigns.id */
  @Column({ name: 'campaign_id' })
  campaignId: string;

  @Column({ type: 'enum', enum: AdEventType })
  eventType: AdEventType;

  /** FK → users.id (nullable — anonymous visitors) */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', nullable: true, type: 'text' })
  userAgent: string | null;

  @ManyToOne(() => AdCampaign, (campaign) => campaign.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: AdCampaign;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
