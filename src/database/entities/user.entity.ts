import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from "typeorm";
import { UserRole, UserStatus } from "../../common/enums";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 15, nullable: true })
  phone: string | null;

  @Column({ name: "firebase_uid", unique: true, nullable: true, length: 128 })
  firebaseUid: string | null;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: "password_hash", type: "text" })
  passwordHash: string;

  @Column({ type: "enum", enum: UserRole })
  role: UserRole;

  @Column({
    type: "enum",
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl: string | null;

  @Column({ name: "full_name", length: 255, nullable: true })
  fullName: string | null;

  @Column({ name: "is_phone_verified", default: false })
  isPhoneVerified: boolean;

  @Column({ name: "is_email_verified", default: false })
  isEmailVerified: boolean;

  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
