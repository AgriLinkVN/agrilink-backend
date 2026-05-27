import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('product_wishlists')
export class ProductWishlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → users.id */
  @Column({ name: 'user_id' })
  userId: string;

  /** FK → products.id */
  @Column({ name: 'product_id' })
  productId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
