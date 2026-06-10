import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MemberStatus } from '../../../common/enums';

@Entity('cooperative_members')
export class CooperativeMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id (the cooperative account) */
  @Column({ name: 'cooperative_id' })
  cooperativeId: string;

  /** FK → users.id (the farmer member) */
  @Column({ name: 'farmer_id' })
  farmerId: string;

  @Column({ type: 'enum', enum: MemberStatus, default: MemberStatus.PENDING })
  status: MemberStatus;

  @Column({ nullable: true, type: 'text' })
  role: string;

  @Column({ name: 'joined_at', nullable: true, type: 'timestamptz' })
  joinedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
