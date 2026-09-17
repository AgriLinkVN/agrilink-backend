import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumPost } from './entities/forum-post.entity';
import { ForumComment } from './entities/forum-comment.entity';
import { ForumLike } from './entities/forum-like.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ForumService {
  constructor(
    @InjectRepository(ForumPost)
    private readonly postRepo: Repository<ForumPost>,
    @InjectRepository(ForumComment)
    private readonly commentRepo: Repository<ForumComment>,
    @InjectRepository(ForumLike)
    private readonly likeRepo: Repository<ForumLike>,
  ) {}

  async listPosts(pagination: PaginationDto, category?: string, search?: string) {
    const qb = this.postRepo
      .createQueryBuilder('post')
      .where('post.is_hidden = false')
      .orderBy(`post.${pagination.sortBy ?? 'created_at'}`, pagination.sortOrder ?? 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit ?? 20);

    if (category) qb.andWhere('post.category = :category', { category });
    if (search) qb.andWhere('(post.title ILIKE :s OR post.content ILIKE :s)', { s: `%${search}%` });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getPost(id: string): Promise<ForumPost> {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post || post.isHidden) throw new NotFoundException('Post not found');
    await this.postRepo.increment({ id }, 'viewCount', 1);
    return post;
  }

  async createPost(authorId: string, dto: CreatePostDto): Promise<ForumPost> {
    const post = this.postRepo.create({ ...dto, authorId, imageUrls: dto.imageUrls ?? null });
    return this.postRepo.save(post);
  }

  async updatePost(id: string, authorId: string, dto: UpdatePostDto): Promise<ForumPost> {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== authorId) throw new ForbiddenException('Not your post');
    Object.assign(post, dto);
    return this.postRepo.save(post);
  }

  async deletePost(id: string, authorId: string): Promise<{ success: true }> {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== authorId) throw new ForbiddenException('Not your post');
    await this.postRepo.remove(post);
    return { success: true };
  }

  async listComments(postId: string, pagination: PaginationDto) {
    const [data, total] = await this.commentRepo.findAndCount({
      where: { postId, isHidden: false },
      order: { createdAt: 'ASC' },
      skip: pagination.skip,
      take: pagination.limit ?? 50,
    });
    return { data, total };
  }

  async addComment(postId: string, authorId: string, dto: CreateCommentDto): Promise<ForumComment> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const comment = this.commentRepo.create({ postId, authorId, content: dto.content });
    const saved = await this.commentRepo.save(comment);
    await this.postRepo.increment({ id: postId }, 'commentCount', 1);
    return saved;
  }

  async deleteComment(commentId: string, authorId: string): Promise<{ success: true }> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== authorId) throw new ForbiddenException('Not your comment');
    await this.commentRepo.remove(comment);
    await this.postRepo.decrement({ id: comment.postId }, 'commentCount', 1);
    return { success: true };
  }

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.likeRepo.findOne({ where: { postId, userId } });
    if (existing) {
      await this.likeRepo.remove(existing);
      await this.postRepo.decrement({ id: postId }, 'likeCount', 1);
      return { liked: false, likeCount: post.likeCount - 1 };
    }

    await this.likeRepo.save(this.likeRepo.create({ postId, userId }));
    await this.postRepo.increment({ id: postId }, 'likeCount', 1);
    return { liked: true, likeCount: post.likeCount + 1 };
  }

  async setHidden(postId: string, isHidden: boolean): Promise<ForumPost> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    post.isHidden = isHidden;
    return this.postRepo.save(post);
  }
}
