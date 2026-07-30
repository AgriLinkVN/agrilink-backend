import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import {
  AdminReviewFilter,
  CreateReviewInput,
  PublicReviewListResult,
  RatingStatsModel,
  ReviewListResult,
  ReviewModel,
  ReviewPagination,
  SellerReviewFilter,
} from '../../../application/models/review.model';
import { ReviewsRepositoryPort } from '../../../application/ports/outbound/reviews-repository.port';
import { Review } from '../entities/review.entity';

@Injectable()
export class TypeOrmReviewsRepository implements ReviewsRepositoryPort {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
  ) {}

  async createIfAbsent(input: CreateReviewInput): Promise<ReviewModel | null> {
    const review = this.reviews.create({
      productId: input.productId,
      reviewerId: input.reviewerId,
      revieweeId: input.revieweeId,
      rating: input.rating,
      comment: input.comment,
      images: input.images,
      isVerifiedPurchase: false,
    });

    try {
      const saved = await this.reviews.save(review);
      return this.toModel(saved);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return null;
      }
      throw error;
    }
  }

  async findById(id: string): Promise<ReviewModel | null> {
    const review = await this.reviews.findOne({
      where: { id },
    });
    return review ? this.toModel(review) : null;
  }

  async findPublicByProduct(
    productId: string,
    pagination: ReviewPagination,
  ): Promise<PublicReviewListResult> {
    const { page, limit } = this.normalizePagination(pagination, 10);
    const { reviews, total } = await this.findPage(
      this.reviews
        .createQueryBuilder('review')
        .where('review.product_id = :productId', { productId })
        .andWhere('review.is_hidden = false')
        .orderBy('review.created_at', 'DESC'),
      page,
      limit,
    );
    return {
      data: reviews.map((review) => this.toModel(review)),
      total,
      page,
      limit,
      stats: await this.getRatingStats(productId),
    };
  }

  async findForSeller(
    sellerId: string,
    filter: SellerReviewFilter,
  ): Promise<ReviewListResult> {
    const { page, limit } = this.normalizePagination(filter, 20);
    const query = this.reviews
      .createQueryBuilder('review')
      .where('review.reviewee_id = :sellerId', { sellerId })
      .andWhere('review.is_hidden = false')
      .orderBy('review.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filter.replied === true) {
      query.andWhere('review.seller_reply IS NOT NULL');
    }
    if (filter.replied === false) {
      query.andWhere('review.seller_reply IS NULL');
    }

    const { reviews, total } = await this.findPage(query, page, limit);
    return { data: reviews.map((review) => this.toModel(review)), total, page, limit };
  }

  async findForModeration(filter: AdminReviewFilter): Promise<ReviewListResult> {
    const { page, limit } = this.normalizePagination(filter, 20);
    const query = this.reviews
      .createQueryBuilder('review')
      .orderBy('review.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filter.isHidden !== undefined) {
      query.where('review.is_hidden = :isHidden', { isHidden: filter.isHidden });
    }

    const { reviews, total } = await this.findPage(query, page, limit);
    return { data: reviews.map((review) => this.toModel(review)), total, page, limit };
  }

  async saveReplyIfUnreplied(
    id: string,
    sellerId: string,
    reply: string,
    repliedAt: Date,
  ): Promise<ReviewModel | null> {
    const result = await this.reviews.update(
      { id, revieweeId: sellerId, sellerReply: IsNull() },
      { sellerReply: reply, sellerReplyAt: repliedAt },
    );
    if (result.affected !== 1) {
      return null;
    }
    return this.findById(id);
  }

  async setVisibility(
    id: string,
    expectedHidden: boolean,
    isHidden: boolean,
    hiddenReason: string | null,
    hiddenBy: string | null,
    hiddenAt: Date | null,
  ): Promise<ReviewModel | null> {
    const result = await this.reviews.update(
      { id, isHidden: expectedHidden },
      { isHidden, hiddenReason, hiddenBy, hiddenAt },
    );
    if (result.affected !== 1) {
      return null;
    }
    return this.findById(id);
  }

  private async getRatingStats(productId: string): Promise<RatingStatsModel> {
    const rows = await this.reviews
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('review.product_id = :productId', { productId })
      .andWhere('review.is_hidden = false')
      .groupBy('review.rating')
      .getRawMany<{ rating: string; count: string }>();

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let sum = 0;
    for (const row of rows) {
      const rating = Number(row.rating);
      const count = Number(row.count);
      distribution[rating] = count;
      total += count;
      sum += rating * count;
    }
    return { avg: total ? Math.round((sum / total) * 10) / 10 : 0, total, distribution };
  }

  private normalizePagination(
    pagination: ReviewPagination,
    defaultLimit: number,
  ): { page: number; limit: number } {
    return {
      page: Math.max(1, pagination.page ?? 1),
      limit: Math.min(100, Math.max(1, pagination.limit ?? defaultLimit)),
    };
  }

  private async findPage(
    query: ReturnType<Repository<Review>['createQueryBuilder']>,
    page: number,
    limit: number,
  ): Promise<{ reviews: Review[]; total: number }> {
    const { entities, raw } = await query
      .addSelect('COUNT(*) OVER()', '__total')
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();
    return {
      reviews: entities,
      total:
        raw.length > 0
          ? Number(raw[0].__total)
          : await query.clone().getCount(),
    };
  }

  private toModel(review: Review): ReviewModel {
    return {
      id: review.id,
      reviewerId: review.reviewerId,
      revieweeId: review.revieweeId,
      productId: review.productId,
      rating: review.rating,
      comment: review.comment,
      images: review.images ?? [],
      isVerifiedPurchase: review.isVerifiedPurchase,
      sellerReply: review.sellerReply,
      sellerReplyAt: review.sellerReplyAt,
      isHidden: review.isHidden,
      hiddenReason: review.hiddenReason,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }
}
