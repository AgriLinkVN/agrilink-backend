import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplierType } from '../../../common/enums';

@Entity('supplier_profiles')
export class SupplierProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id */
  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'company_name' })
  companyName: string;

  @Column({ type: 'enum', enum: SupplierType, nullable: true })
  supplierType: SupplierType;

  @Column({ name: 'tax_code', nullable: true })
  taxCode: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ name: 'website_url', nullable: true })
  websiteUrl: string;

  /** FK → provinces.id */
  @Column({ name: 'province_id', nullable: true })
  provinceId: string;

  /** FK → districts.id */
  @Column({ name: 'district_id', nullable: true })
  districtId: string;

  @Column({ nullable: true, type: 'text' })
  address: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
