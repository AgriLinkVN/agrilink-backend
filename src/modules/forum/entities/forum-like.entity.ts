import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('forum_likes')
@Unique(['postId', 'userId'])
export class ForumLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → forum_posts.id */
  @Column({ name: 'post_id' })
  postId: string;

  /** FK → users.id */
  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
