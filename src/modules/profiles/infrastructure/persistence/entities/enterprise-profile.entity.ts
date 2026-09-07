import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("enterprise_profiles")
export class EnterpriseProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId: string | null;

  @OneToOne("User", { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_id",
    foreignKeyConstraintName: "FK_7b9aac16881c9af649fd74011b9",
  })
  private userReference?: unknown;

  @Column({ name: "company_name", length: 255 })
  companyName: string;

  @Column({ name: "tax_code", length: 20, unique: true })
  taxCode: string;

  @Column({
    name: "business_license_url",
    type: "text",
    nullable: true,
    select: false,
  })
  businessLicenseUrl: string | null;

  @Index("IDX_enterprise_profiles_business_license_file_id")
  @Column({ name: "business_license_file_id", type: "uuid", nullable: true })
  businessLicenseFileId: string | null;

  @ManyToOne("StoredFileEntity", { nullable: true, onDelete: "NO ACTION" })
  @JoinColumn({
    name: "business_license_file_id",
    foreignKeyConstraintName: "FK_enterprise_profiles_business_license_file_id",
  })
  private businessLicenseFileReference?: unknown;

  @Column({ name: "representative_name", length: 255 })
  representativeName: string;

  @Column({ name: "representative_phone", length: 15 })
  representativePhone: string;

  @Column({ type: "text" })
  address: string;

  @Column({ name: "province_id", type: "int", nullable: true })
  provinceId: number | null;

  @Column({ length: 255, nullable: true })
  industry: string | null;

  @Column({ name: "is_verified", default: false })
  isVerified: boolean;

  @Column({ name: "verified_by", type: "uuid", nullable: true })
  verifiedBy: string | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
