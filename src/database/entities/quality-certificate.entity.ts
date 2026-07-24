import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { CertType } from '../../common/enums';

@Entity('quality_certificates')
export class QualityCertificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'issued_to', type: 'uuid' })
  issuedTo: string;

  @Column({ name: 'cert_type', type: 'enum', enum: CertType })
  certType: CertType;

  @Column({ name: 'cert_number', length: 100, unique: true })
  certNumber: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ name: 'issued_by', type: 'uuid' })
  issuedBy: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ name: 'document_url', type: 'text', nullable: true, select: false })
  documentUrl: string | null;

  @Column({ name: 'stored_file_id', type: 'uuid', nullable: true })
  storedFileId: string | null;

  @Column({ length: 50, default: 'active' })
  status: string;

  @Column({ name: 'revoked_reason', type: 'text', nullable: true })
  revokedReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
