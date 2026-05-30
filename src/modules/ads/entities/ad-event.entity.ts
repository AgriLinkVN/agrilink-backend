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
  impression = 'impression',
  click = 'click',
}

@Entity('ad_events')
export class AdEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id' })
  campaignId: string;

  @Column({ type: 'enum', enum: AdEventType })
  eventType: AdEventType;

  /** FK → users.id (nullable — anonymous visitors) */
  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true, type: 'text' })
  userAgent: string;

  @ManyToOne(() => AdCampaign, (c) => c.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: AdCampaign;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
