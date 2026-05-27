import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('enterprise_profiles')
export class EnterpriseProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id */
  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'company_name' })
  companyName: string;

  @Column({ name: 'tax_code', nullable: true })
  taxCode: string;

  @Column({ name: 'industry', nullable: true })
  industry: string;

  @Column({ name: 'website_url', nullable: true })
  websiteUrl: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

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
