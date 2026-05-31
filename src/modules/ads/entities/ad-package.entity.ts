import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdType } from '../../../common/enums';

/** Convert PostgreSQL `numeric` (returned as string) to JS `number`. */
const numericTransformer = {
  to: (v?: number) => v,
  from: (v?: string | null) => (v == null ? 0 : parseFloat(v)),
};

/**
 * Matches SQL schema: ad_packages
 *   id          INT IDENTITY PK   ← INT, not UUID (matches AgriLink.sql)
 *   name        VARCHAR(100)
 *   type        ad_type           ← column name is "type" in SQL; mapped to TS prop `adType`
 *   price       NUMERIC(12,2)
 *   duration_days
 *   max_impressions
 *   description
 *   is_active
 */
@Entity('ad_packages')
export class AdPackage {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'type', type: 'enum', enum: AdType })
  adType: AdType;

  @Column({ name: 'duration_days' })
  durationDays: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
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
