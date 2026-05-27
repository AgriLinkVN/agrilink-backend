import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { NotifType } from '../../../common/enums';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id (recipient) */
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: NotifType })
  type: NotifType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  /** Optional JSON payload for deep-linking (e.g., { orderId: '...' }) */
  @Column({ nullable: true, type: 'jsonb' })
  data: object;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', nullable: true, type: 'timestamptz' })
  readAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
