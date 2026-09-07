import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { AdType } from '../../../../../common/enums';

@Entity('ad_packages')
@Unique('UQ_ad_packages_package_code', ['packageCode'])
export class AdPackage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'package_code',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  packageCode: string;

  @Column()
  name: string;

  @Column({ name: 'type', type: 'enum', enum: AdType })
  adType: AdType;

  @Column({ name: 'duration_days' })
  durationDays: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value?: number) => value,
      from: (value?: string | null) => (value == null ? 0 : Number(value)),
    },
  })
  price: number;

  @Column({ name: 'max_impressions', nullable: true })
  maxImpressions: number;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
