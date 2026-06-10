import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { AdStatus } from '../../common/enums';

@Entity('ad_campaigns')
export class AdCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Column({ name: 'package_id', type: 'int' })
  packageId: number;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @Column({ name: 'link_url', type: 'text', nullable: true })
  linkUrl: string | null;

  @Column({ name: 'target_provinces', type: 'int', array: true, default: [] })
  targetProvinces: number[];

  @Column({ type: 'enum', enum: AdStatus, default: AdStatus.PENDING_APPROVAL })
  status: AdStatus;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ name: 'total_impressions', type: 'int', default: 0 })
  totalImpressions: number;

  @Column({ name: 'total_clicks', type: 'int', default: 0 })
  totalClicks: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
