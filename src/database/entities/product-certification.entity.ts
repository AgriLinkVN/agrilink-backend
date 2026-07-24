import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { CertificationStatus, CertType } from '../../common/enums';

@Entity('product_certifications')
export class ProductCertification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'cert_type', type: 'enum', enum: CertType })
  certType: CertType;

  @Column({ name: 'cert_number', length: 100, nullable: true })
  certNumber: string | null;

  @Column({ name: 'issued_by', length: 255, nullable: true })
  issuedBy: string | null;

  @Column({ name: 'issued_date', type: 'date', nullable: true })
  issuedDate: string | null;

  @Column({ name: 'expires_date', type: 'date', nullable: true })
  expiresDate: string | null;

  @Column({ name: 'document_url', type: 'text', nullable: true, select: false })
  documentUrl: string | null;

  @Column({ name: 'stored_file_id', type: 'uuid', nullable: true })
  storedFileId: string | null;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({
    type: 'enum',
    enum: CertificationStatus,
    default: CertificationStatus.PENDING,
  })
  status: CertificationStatus;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
