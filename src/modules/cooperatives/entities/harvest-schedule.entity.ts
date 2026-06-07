import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductUnit } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';

const numericTransformer = {
  to: (v?: number) => v,
  from: (v?: string | null) => (v == null ? null : parseFloat(v)),
};

/**
 * Matches SQL schema: harvest_schedules
 *   id             UUID PK
 *   cooperative_id UUID FK → users.id  (HTX account that tracks this schedule)
 *   farmer_id      UUID FK → users.id  (the farmer responsible for harvesting)
 *   product_id     UUID FK → products.id (optional — for a general crop)
 *   expected_date  DATE   NOT NULL
 *   estimated_qty  NUMERIC
 *   unit           product_unit
 *   actual_date    DATE
 *   actual_qty     NUMERIC
 *   note           TEXT
 *   created_at / updated_at
 */
@Entity('harvest_schedules')
@Index('idx_harvest_coop_date', ['cooperativeId', 'expectedDate'])
@Index('idx_harvest_farmer_date', ['farmerId', 'expectedDate'])
export class HarvestSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id (HTX). Null when farmer logs individually. */
  @Column({ name: 'cooperative_id', nullable: true })
  cooperativeId: string | null;

  /** FK → users.id (farmer responsible for the crop) */
  @Column({ name: 'farmer_id' })
  farmerId: string;

  /** FK → products.id (optional) */
  @Column({ name: 'product_id', nullable: true })
  productId: string | null;

  @Column({ name: 'expected_date', type: 'date' })
  expectedDate: string;

  @Column({
    name: 'estimated_qty',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  estimatedQty: number | null;

  @Column({ type: 'enum', enum: ProductUnit, nullable: true })
  unit: ProductUnit | null;

  @Column({ name: 'actual_date', type: 'date', nullable: true })
  actualDate: string | null;

  @Column({
    name: 'actual_qty',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  actualQty: number | null;

  @Column({ nullable: true, type: 'text' })
  note: string | null;

  // ── Relations ─────────────────────────────────────────────────────────────

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmer_id' })
  farmer: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cooperative_id' })
  cooperative: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
