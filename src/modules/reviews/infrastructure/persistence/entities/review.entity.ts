import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reviews')
@Check('CHK_reviews_rating_range', '"rating" >= 1 AND "rating" <= 5')
@Index('IDX_reviews_reviewer_product_unique', ['reviewerId', 'productId'], {
  unique: true,
  where: '"product_id" IS NOT NULL',
})
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId: string;

  @ManyToOne('User', { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'reviewer_id' })
  private reviewerReference?: unknown;

  @Column({ name: 'reviewee_id', type: 'uuid', nullable: true })
  revieweeId: string | null;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne('Product', { nullable: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'product_id' })
  private productReference?: unknown;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'text', array: true, default: [] })
  images: string[];

  @Column({ name: 'is_verified_purchase', default: false })
  isVerifiedPurchase: boolean;

  @Column({ name: 'seller_reply', type: 'text', nullable: true })
  sellerReply: string | null;

  @Column({ name: 'seller_reply_at', type: 'timestamptz', nullable: true })
  sellerReplyAt: Date | null;

  @Column({ name: 'is_hidden', default: false })
  isHidden: boolean;

  @Column({ name: 'hidden_reason', type: 'text', nullable: true })
  hiddenReason: string | null;

  @Column({ name: 'hidden_by', type: 'uuid', nullable: true })
  hiddenBy: string | null;

  @Column({ name: 'hidden_at', type: 'timestamptz', nullable: true })
  hiddenAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

}
