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
import { AdStatus } from '../../../../../common/enums';
import { AdEvent } from './ad-event.entity';
import { AdPackage } from './ad-package.entity';

@Entity('ad_campaigns')
export class AdCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Column({ name: 'package_id', type: 'int' })
  packageId: number;

  @Column()
  title: string;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @Column({ name: 'link_url', nullable: true, type: 'text' })
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

  @ManyToOne(() => AdPackage, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'package_id' })
  package: AdPackage;

  @OneToMany(() => AdEvent, (event) => event.campaign)
  events: AdEvent[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
