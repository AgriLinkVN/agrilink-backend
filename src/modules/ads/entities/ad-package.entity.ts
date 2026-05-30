import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AdType } from '../../../common/enums';

/** Convert PostgreSQL `numeric` (returned as string) to JS `number`. */
const numericTransformer = {
  to: (v?: number) => v,
  from: (v?: string | null) => (v == null ? 0 : parseFloat(v)),
};

@Entity('ad_packages')
export class AdPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'ad_type', type: 'enum', enum: AdType })
  adType: AdType;

  @Column({ name: 'duration_days' })
  durationDays: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: numericTransformer })
  price: number;

  @Column({ name: 'max_impressions', nullable: true })
  maxImpressions: number | null;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
