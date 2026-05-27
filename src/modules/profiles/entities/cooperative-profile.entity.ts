import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Region } from '../../../common/enums';

@Entity('cooperative_profiles')
export class CooperativeProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id */
  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'cooperative_name' })
  cooperativeName: string;

  @Column({ name: 'registration_number', nullable: true })
  registrationNumber: string;

  @Column({ name: 'established_year', nullable: true })
  establishedYear: number;

  @Column({ name: 'member_count', default: 0 })
  memberCount: number;

  @Column({ type: 'enum', enum: Region, nullable: true })
  region: Region;

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

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
