import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id (actor) */
  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column()
  action: string;

  /** e.g. "Product", "User", "SystemConfig" */
  @Column({ name: 'entity_type', nullable: true })
  entityType: string;

  /** UUID of the affected record */
  @Column({ name: 'entity_id', nullable: true })
  entityId: string;

  /** HTTP method of the request */
  @Column({ nullable: true })
  method: string;

  /** Request path */
  @Column({ nullable: true })
  path: string;

  /** Optional JSON diff of before/after state */
  @Column({ name: 'changes', nullable: true, type: 'jsonb' })
  changes: object;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
