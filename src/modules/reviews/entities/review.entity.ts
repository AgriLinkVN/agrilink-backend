import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → products.id */
  @Column({ name: 'product_id' })
  productId: string;

  /** FK → users.id (reviewer / buyer) */
  @Column({ name: 'reviewer_id' })
  reviewerId: string;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ nullable: true, type: 'text' })
  comment: string;

  /** Seller's reply to the review */
  @Column({ nullable: true, type: 'text' })
  reply: string;

  @Column({ name: 'replied_at', nullable: true, type: 'timestamptz' })
  repliedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
