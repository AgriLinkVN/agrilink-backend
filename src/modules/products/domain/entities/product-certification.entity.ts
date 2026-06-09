import { CertType } from '@common/enums';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_certifications')
export class ProductCertification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ─── Relations ────────────────────────────────────────────────
  @ManyToOne(() => Product, (product) => product.certifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}