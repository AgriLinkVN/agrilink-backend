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

@Entity("farmer_profiles")
export class FarmerProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId: string | null;

  @OneToOne("User", { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_id",
    foreignKeyConstraintName: "FK_77f5f5145225ffcaa3583fb0ee1",
  })
  private userReference?: unknown;

  @Column({ name: "cccd_number", length: 12, unique: true })
  cccdNumber: string;

  @Column({
    name: "cccd_front_url",
    type: "text",
    nullable: true,
    select: false,
  })
  cccdFrontUrl: string | null;

  @Column({
    name: "cccd_back_url",
    type: "text",
    nullable: true,
    select: false,
  })
  cccdBackUrl: string | null;

  @Index("IDX_farmer_profiles_cccd_front_file_id")
  @Column({ name: "cccd_front_file_id", type: "uuid", nullable: true })
  cccdFrontFileId: string | null;

  @ManyToOne("StoredFileEntity", { nullable: true, onDelete: "NO ACTION" })
  @JoinColumn({
    name: "cccd_front_file_id",
    foreignKeyConstraintName: "FK_farmer_profiles_cccd_front_file_id",
  })
  private cccdFrontFileReference?: unknown;

  @Index("IDX_farmer_profiles_cccd_back_file_id")
  @Column({ name: "cccd_back_file_id", type: "uuid", nullable: true })
  cccdBackFileId: string | null;

  @ManyToOne("StoredFileEntity", { nullable: true, onDelete: "NO ACTION" })
  @JoinColumn({
    name: "cccd_back_file_id",
    foreignKeyConstraintName: "FK_farmer_profiles_cccd_back_file_id",
  })
  private cccdBackFileReference?: unknown;

  @Column({ name: "residence_address", type: "text", nullable: true })
  residenceAddress: string | null;

  @Column({ name: "ward", nullable: true })
  ward: string | null;

  @Column({ name: "is_kyc_verified", default: false })
  isKycVerified: boolean;

  @Column({ name: "verified_by", type: "uuid", nullable: true })
  verifiedBy: string | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason: string | null;

  @Column({ name: "province_id", type: "int", nullable: true })
  provinceId: number | null;

  @Column({ name: "district_id", type: "int", nullable: true })
  districtId: number | null;

  @Column({ type: "text", nullable: true })
  bio: string | null;

  @Column({ name: "farm_name", length: 255, nullable: true })
  farmName: string | null;

  @Column({ name: "experience_years", type: "int", nullable: true })
  experienceYears: number | null;

  @Column({
    name: "trust_score",
    type: "decimal",
    precision: 3,
    scale: 2,
    default: 0,
  })
  trustScore: number;

  @Column({ name: "total_sales", type: "int", default: 0 })
  totalSales: number;

  @Column({ name: "verified_at", type: "timestamptz", nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
