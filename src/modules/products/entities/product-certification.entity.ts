import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CertType } from '../../../common/enums';

@Entity('product_certifications')
export class ProductCertification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → products.id */
  @Column({ name: 'product_id' })
  productId: string;

  @Column({ type: 'enum', enum: CertType })
  certType: CertType;

  @Column({ name: 'cert_number', nullable: true })
  certNumber: string;

  @Column({ name: 'issued_by', nullable: true })
  issuedBy: string;

  @Column({ name: 'issued_date', nullable: true, type: 'date' })
  issuedDate: Date;

  @Column({ name: 'expiry_date', nullable: true, type: 'date' })
  expiryDate: Date;

  @Column({ name: 'document_url', nullable: true })
  documentUrl: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
