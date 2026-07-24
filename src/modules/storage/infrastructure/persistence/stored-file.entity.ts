import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('stored_files')
@Index(['provider', 'objectKey'], { unique: true })
@Index(['ownerId', 'status'])
export class StoredFileEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'owner_id', type: 'uuid' }) ownerId: string;
  @Column() assetType: string;
  @Column() provider: string;
  @Column() visibility: string;
  @Column({ default: 'PENDING' }) status: string;
  @Column({ name: 'object_key', unique: true }) objectKey: string;
  @Column({ name: 'original_name' }) originalName: string;
  @Column({ nullable: true }) extension: string | null;
  @Column({ name: 'declared_mime' }) declaredMime: string;
  @Column({ name: 'size_bytes', type: 'bigint' }) sizeBytes: string;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt: Date;
  @Column({ name: 'resource_type', nullable: true }) resourceType: string | null;
  @Column({ name: 'resource_id', nullable: true }) resourceId: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
