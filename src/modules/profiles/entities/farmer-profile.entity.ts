import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FarmingType, Region } from '../../../common/enums';

@Entity('farmer_profiles')
export class FarmerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id */
  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'farm_name', nullable: true })
  farmName: string;

  @Column({ name: 'farm_area_hectares', type: 'decimal', precision: 10, scale: 2, nullable: true })
  farmAreaHectares: number;

  @Column({ type: 'enum', enum: FarmingType, nullable: true })
  farmingType: FarmingType;

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

  @Column({ name: 'bio', nullable: true, type: 'text' })
  bio: string;

  @Column({ name: 'experience_years', nullable: true })
  experienceYears: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
