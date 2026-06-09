import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId: string;

  @Column({ name: 'reviewee_id', type: 'uuid' })
  revieweeId: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'text', array: true, default: [] })
  images: string[];

  @Column({ name: 'is_verified_purchase', default: true })
  isVerifiedPurchase: boolean;

  @Column({ name: 'seller_reply', type: 'text', nullable: true })
  sellerReply: string | null;

  @Column({ name: 'seller_reply_at', type: 'timestamptz', nullable: true })
  sellerReplyAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
