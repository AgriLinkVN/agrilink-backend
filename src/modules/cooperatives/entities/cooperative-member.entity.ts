import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { MemberStatus } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';

/**
 * Matches SQL schema: cooperative_members
 *   id                UUID PK
 *   cooperative_id    UUID FK → users.id  (cooperative account)
 *   farmer_id         UUID FK → users.id
 *   status            member_status
 *   join_request_note TEXT
 *   approved_by       UUID FK → users.id (admin/coop owner who approved)
 *   approved_at       TIMESTAMPTZ
 *   rejected_reason   TEXT
 *   created_at        TIMESTAMPTZ
 */
@Entity('cooperative_members')
@Unique('uq_member_coop_farmer', ['cooperativeId', 'farmerId'])
@Index('idx_member_coop_status', ['cooperativeId', 'status'])
@Index('idx_member_farmer', ['farmerId'])
export class CooperativeMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id (cooperative account) */
  @Column({ name: 'cooperative_id' })
  cooperativeId: string;

  /** FK → users.id (the farmer applying or joined) */
  @Column({ name: 'farmer_id' })
  farmerId: string;

  @Column({ type: 'enum', enum: MemberStatus, default: MemberStatus.pending })
  status: MemberStatus;

  /** Optional note from the farmer when requesting to join */
  @Column({ name: 'join_request_note', nullable: true, type: 'text' })
  joinRequestNote: string | null;

  /** FK → users.id (cooperative owner who approved/rejected) */
  @Column({ name: 'approved_by', nullable: true })
  approvedById: string | null;

  @Column({ name: 'approved_at', nullable: true, type: 'timestamptz' })
  approvedAt: Date | null;

  @Column({ name: 'rejected_reason', nullable: true, type: 'text' })
  rejectedReason: string | null;

  // ── Relations (read-only joins) ───────────────────────────────────────────

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'farmer_id' })
  farmer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cooperative_id' })
  cooperative: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
