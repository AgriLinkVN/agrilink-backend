import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { ForumPost } from './entities/forum-post.entity';
import { ForumComment } from './entities/forum-comment.entity';
import { ForumLike } from './entities/forum-like.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ForumPost, ForumComment, ForumLike])],
  controllers: [ForumController],
  providers: [ForumService],
  exports: [ForumService],
})
export class ForumModule {}
