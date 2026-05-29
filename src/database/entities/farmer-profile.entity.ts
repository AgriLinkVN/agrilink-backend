import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('farmer_profiles')
export class FarmerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'cccd_number', length: 12, unique: true })
  cccdNumber: string;

  @Column({ name: 'cccd_front_url', type: 'text', nullable: true })
  cccdFrontUrl: string | null;

  @Column({ name: 'cccd_back_url', type: 'text', nullable: true })
  cccdBackUrl: string | null;

  @Column({ name: 'residence_address', type: 'text' })
  residenceAddress: string;

  @Column({ name: 'province_id', type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ name: 'district_id', type: 'int', nullable: true })
  districtId: number | null;

  @Column({ nullable: true, length: 255 })
  ward: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ name: 'trust_score', type: 'decimal', precision: 3, scale: 2, default: 0 })
  trustScore: number;

  @Column({ name: 'total_sales', type: 'int', default: 0 })
  totalSales: number;

  @Column({ name: 'is_kyc_verified', default: false })
  isKycVerified: boolean;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
