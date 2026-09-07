import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { SupplierType } from "../../../../../common/enums";

@Entity("supplier_profiles")
export class SupplierProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid", unique: true })
  userId: string;

  @ManyToOne("User", { nullable: false, onDelete: "NO ACTION" })
  @JoinColumn({
    name: "user_id",
    foreignKeyConstraintName: "FK_supplier_profiles_user",
  })
  private userReference?: unknown;

  @Column({ name: "company_name", length: 255 })
  companyName: string;

  @Column({ name: "tax_code", length: 20, nullable: true })
  taxCode: string | null;

  @Column({ type: "text", nullable: true })
  address: string | null;

  @Column({ name: "province_id", type: "int", nullable: true })
  provinceId: number | null;

  @Column({ name: "supplier_type", type: "enum", enum: SupplierType })
  supplierType: SupplierType;

  @Column({ name: "is_verified", default: false })
  isVerified: boolean;

  @Column({
    name: "business_license_url",
    type: "text",
    nullable: true,
    select: false,
  })
  businessLicenseUrl: string | null;

  @Index("IDX_supplier_profiles_business_license_file_id")
  @Column({ name: "business_license_file_id", type: "uuid", nullable: true })
  businessLicenseFileId: string | null;

  @ManyToOne("StoredFileEntity", { nullable: true, onDelete: "NO ACTION" })
  @JoinColumn({
    name: "business_license_file_id",
    foreignKeyConstraintName: "FK_supplier_profiles_business_license_file_id",
  })
  private businessLicenseFileReference?: unknown;

  @Column({ name: "verified_by", type: "uuid", nullable: true })
  verifiedBy: string | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
