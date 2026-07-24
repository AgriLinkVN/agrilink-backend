import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CooperativeMemberStatus } from '../../../domain/models/cooperative-persistence.models';

@Entity('cooperative_members')
export class CooperativeMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cooperative_id', type: 'uuid' })
  cooperativeId: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmerId: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: CooperativeMemberStatus;

  @Column({ type: 'text', nullable: true })
  role: string | null;

  @Column({ name: 'joined_at', type: 'timestamptz', nullable: true })
  joinedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
