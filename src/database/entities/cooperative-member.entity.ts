import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { MemberStatus } from '../../common/enums';

@Entity('cooperative_members')
export class CooperativeMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cooperative_id', type: 'uuid' })
  cooperativeId: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmerId: string;

  @Column({ type: 'enum', enum: MemberStatus, default: MemberStatus.PENDING })
  status: MemberStatus;

  @Column({ name: 'join_request_note', type: 'text', nullable: true })
  joinRequestNote: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejected_reason', type: 'text', nullable: true })
  rejectedReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
