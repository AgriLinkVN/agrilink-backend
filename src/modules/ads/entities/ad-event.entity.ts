import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AdEventType {
  impression = 'impression',
  click = 'click',
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
  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true, type: 'text' })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
