import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AdType } from '../../common/enums';

@Entity('ad_packages')
export class AdPackage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: AdType })
  type: AdType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: number;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays: number;

  @Column({ name: 'max_impressions', type: 'int', nullable: true })
  maxImpressions: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
