import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('cooperative_profiles')
export class CooperativeProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'cooperative_name', length: 255 })
  cooperativeName: string;

  @Column({ name: 'business_license_number', length: 50, unique: true })
  businessLicenseNumber: string;

  @Column({ name: 'tax_code', length: 20, unique: true })
  taxCode: string;

  @Column({
    name: 'cooperative_cert_url',
    type: 'text',
    nullable: true,
    select: false,
  })
  cooperativeCertUrl: string | null;

  @Column({
    name: 'business_license_url',
    type: 'text',
    nullable: true,
    select: false,
  })
  businessLicenseUrl: string | null;

  @Column({ name: 'representative_name', length: 255 })
  representativeName: string;

  @Column({ name: 'representative_phone', length: 15 })
  representativePhone: string;

  @Column({ name: 'representative_cccd', length: 12 })
  representativeCccd: string;

  @Column({
    name: 'representative_cccd_front_url',
    type: 'text',
    nullable: true,
    select: false,
  })
  representativeCccdFrontUrl: string | null;

  @Column({
    name: 'representative_cccd_back_url',
    type: 'text',
    nullable: true,
    select: false,
  })
  representativeCccdBackUrl: string | null;

  @Column({
    name: 'members_list_url',
    type: 'text',
    nullable: true,
    select: false,
  })
  membersListUrl: string | null;

  @Column({ name: 'cooperative_cert_file_id', type: 'uuid', nullable: true })
  cooperativeCertFileId: string | null;

  @Column({ name: 'business_license_file_id', type: 'uuid', nullable: true })
  businessLicenseFileId: string | null;

  @Column({
    name: 'representative_cccd_front_file_id',
    type: 'uuid',
    nullable: true,
  })
  representativeCccdFrontFileId: string | null;

  @Column({
    name: 'representative_cccd_back_file_id',
    type: 'uuid',
    nullable: true,
  })
  representativeCccdBackFileId: string | null;

  @Column({ name: 'members_list_file_id', type: 'uuid', nullable: true })
  membersListFileId: string | null;

  @Column({ type: 'text' })
  address: string;

  @Column({ name: 'province_id', type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ name: 'total_members', type: 'int', default: 0 })
  totalMembers: number;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
