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

@Entity("cooperative_profiles")
export class CooperativeProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId: string | null;

  @OneToOne("User", { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_id",
    foreignKeyConstraintName: "FK_2ee3321e75f5e1f2261baa4e800",
  })
  private userReference?: unknown;

  @Column({ name: "cooperative_name", length: 255 })
  cooperativeName: string;

  @Column({ name: "business_license_number", length: 50, unique: true })
  businessLicenseNumber: string;

  @Column({ name: "tax_code", length: 20, unique: true })
  taxCode: string;

  @Column({
    name: "cooperative_cert_url",
    type: "text",
    nullable: true,
    select: false,
  })
  cooperativeCertUrl: string | null;

  @Column({
    name: "business_license_url",
    type: "text",
    nullable: true,
    select: false,
  })
  businessLicenseUrl: string | null;

  @Column({ name: "representative_name", length: 255 })
  representativeName: string;

  @Column({ name: "representative_phone", length: 15 })
  representativePhone: string;

  @Column({ name: "representative_cccd", length: 12 })
  representativeCccd: string;

  @Column({
    name: "representative_cccd_front_url",
    type: "text",
    nullable: true,
    select: false,
  })
  representativeCccdFrontUrl: string | null;

  @Column({
    name: "representative_cccd_back_url",
    type: "text",
    nullable: true,
    select: false,
  })
  representativeCccdBackUrl: string | null;

  @Column({
    name: "members_list_url",
    type: "text",
    nullable: true,
    select: false,
  })
  membersListUrl: string | null;

  @Index("IDX_cooperative_profiles_cooperative_cert_file_id")
  @Column({ name: "cooperative_cert_file_id", type: "uuid", nullable: true })
  cooperativeCertFileId: string | null;

  @ManyToOne("StoredFileEntity", { nullable: true, onDelete: "NO ACTION" })
  @JoinColumn({
    name: "cooperative_cert_file_id",
    foreignKeyConstraintName:
      "FK_cooperative_profiles_cooperative_cert_file_id",
  })
  private cooperativeCertFileReference?: unknown;

  @Index("IDX_cooperative_profiles_business_license_file_id")
  @Column({ name: "business_license_file_id", type: "uuid", nullable: true })
  businessLicenseFileId: string | null;

  @ManyToOne("StoredFileEntity", { nullable: true, onDelete: "NO ACTION" })
  @JoinColumn({
    name: "business_license_file_id",
    foreignKeyConstraintName:
      "FK_cooperative_profiles_business_license_file_id",
  })
  private businessLicenseFileReference?: unknown;

  @Index("IDX_cooperative_profiles_representative_cccd_front_f")
  @Column({
    name: "representative_cccd_front_file_id",
    type: "uuid",
    nullable: true,
  })
  representativeCccdFrontFileId: string | null;

  @ManyToOne("StoredFileEntity", { nullable: true, onDelete: "NO ACTION" })
  @JoinColumn({
    name: "representative_cccd_front_file_id",
    foreignKeyConstraintName:
      "FK_cooperative_profiles_representative_cccd_front_f",
  })
  private representativeCccdFrontFileReference?: unknown;

  @Index("IDX_cooperative_profiles_representative_cccd_back_fi")
  @Column({
    name: "representative_cccd_back_file_id",
    type: "uuid",
    nullable: true,
  })
  representativeCccdBackFileId: string | null;

  @ManyToOne("StoredFileEntity", { nullable: true, onDelete: "NO ACTION" })
  @JoinColumn({
    name: "representative_cccd_back_file_id",
    foreignKeyConstraintName:
      "FK_cooperative_profiles_representative_cccd_back_fi",
  })
  private representativeCccdBackFileReference?: unknown;

  @Index("IDX_cooperative_profiles_members_list_file_id")
  @Column({ name: "members_list_file_id", type: "uuid", nullable: true })
  membersListFileId: string | null;

  @ManyToOne("StoredFileEntity", { nullable: true, onDelete: "NO ACTION" })
  @JoinColumn({
    name: "members_list_file_id",
    foreignKeyConstraintName: "FK_cooperative_profiles_members_list_file_id",
  })
  private membersListFileReference?: unknown;

  @Column({ type: "text" })
  address: string;

  @Column({ name: "province_id", type: "int", nullable: true })
  provinceId: number | null;

  @Column({ name: "total_members", type: "int", default: 0 })
  totalMembers: number;

  @Column({ name: "member_count", type: "int", nullable: true })
  memberCount: number | null;

  @Column({ name: "is_verified", default: false })
  isVerified: boolean;

  @Column({ name: "verified_by", type: "uuid", nullable: true })
  verifiedBy: string | null;

  @Column({ name: "verified_at", type: "timestamptz", nullable: true })
  verifiedAt: Date | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
