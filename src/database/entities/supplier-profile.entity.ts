import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SupplierType } from '../../common/enums';

@Entity('supplier_profiles')
export class SupplierProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'company_name', length: 255 })
  companyName: string;

  @Column({ name: 'tax_code', length: 20, nullable: true })
  taxCode: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'province_id', type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ name: 'supplier_type', type: 'enum', enum: SupplierType })
  supplierType: SupplierType;

  @Column({ name: 'trust_score', type: 'decimal', precision: 3, scale: 2, default: 0 })
  trustScore: number;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'business_license_url', type: 'text', nullable: true })
  businessLicenseUrl: string;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
