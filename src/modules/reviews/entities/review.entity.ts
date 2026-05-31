import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/domain/entities/product.entity';

@Entity('reviews')
@Unique('uq_reviewer_product', ['reviewerId', 'productId'])
@Index('idx_review_product', ['productId', 'isHidden'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reviewer_id' })
  reviewerId: string;

  @Column({ name: 'reviewee_id' })
  revieweeId: string;

  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @Column({ type: 'smallint' })
  @Check('"rating" >= 1 AND "rating" <= 5')
  rating: number;

  @Column({ nullable: true, type: 'text' })
  comment: string;

  /** JSON-stringified array of image URLs — max 5 */
  @Column({ nullable: true, type: 'text' })
  images: string;

  @Column({ name: 'is_verified_purchase', default: true })
  isVerifiedPurchase: boolean;

  @Column({ name: 'seller_reply', nullable: true, type: 'text' })
  sellerReply: string;

  @Column({ name: 'seller_reply_at', nullable: true, type: 'timestamptz' })
  sellerReplyAt: Date;

  @Column({ name: 'is_hidden', default: false })
  isHidden: boolean;

  @Column({ name: 'hidden_reason', nullable: true, type: 'text' })
  hiddenReason: string;

  // ── Relations ─────────────────────────────────────────────────────────────

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  // NOTE: DB column is NOT NULL; we keep the relation non-nullable to match.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewee_id' })
  reviewee: User;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
