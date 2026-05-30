import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Product } from '../products/entities/product.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotifType } from '../../common/enums';

export interface RatingStats {
  avg: number;
  total: number;
  distribution: Record<number, number>;
}

function maskName(fullName: string): string {
  if (!fullName) return 'Người dùng';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Người dùng';
  if (parts.length === 1) return `${parts[0].charAt(0)}***`;
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}***`;
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async createReview(reviewerId: string, dto: CreateReviewDto): Promise<Review> {
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Sản phẩm "${dto.productId}" không tồn tại`);
    if (product.sellerId === reviewerId) {
      throw new ForbiddenException('Bạn không thể tự đánh giá sản phẩm của mình');
    }

    const review = this.reviewRepo.create({
      reviewerId,
      revieweeId: product.sellerId,
      productId: dto.productId,
      rating: dto.rating,
      comment: dto.comment,
      images: JSON.stringify(dto.images ?? []),
    });

    let saved: Review;
    try {
      saved = await this.reviewRepo.save(review);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as unknown as { code: string }).code === '23505'
      ) {
        throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi');
      }
      throw err;
    }

    // Await side effects sequentially: update product rating before sending the
    // notification, so the seller sees the correct stats if they click through.
    try {
      await this.updateProductRating(dto.productId);
      await this.updateSellerTrustScore(product.sellerId);
    } catch (err) {
      this.logger.error('Failed to update product rating / trust score', err);
    }

    try {
      await this.notificationsService.createAndEmit({
        userId: product.sellerId,
        type: NotifType.new_review,
        title: 'Bạn có đánh giá mới',
        body: `${dto.rating} sao cho sản phẩm "${product.name}"`,
        data: { productId: dto.productId, reviewId: saved.id },
      });
    } catch (err) {
      this.logger.error('Failed to emit new_review notification', err);
    }

    return this.reviewRepo.findOne({
      where: { id: saved.id },
      relations: ['reviewer'],
    }) as Promise<Review>;
  }

  // ── Seller: Reply ─────────────────────────────────────────────────────────

  async replyReview(reviewId: string, sellerId: string, reply: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
      relations: ['reviewee', 'product'],
    });
    if (!review) throw new NotFoundException('Review không tồn tại');

    if (review.revieweeId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền phản hồi review này');
    }

    if (review.sellerReply !== null && review.sellerReply !== undefined) {
      throw new ConflictException('Đã phản hồi review này rồi');
    }

    review.sellerReply = reply;
    review.sellerReplyAt = new Date();
    const saved = await this.reviewRepo.save(review);

    // Notify the reviewer — use dedicated review_reply type
    try {
      await this.notificationsService.createAndEmit({
        userId: review.reviewerId,
        type: NotifType.review_reply,
        title: 'Người bán đã phản hồi đánh giá của bạn',
        body: reply.slice(0, 100) + (reply.length > 100 ? '...' : ''),
        data: {
          productId: review.productId,
          reviewId,
        },
      });
    } catch (err) {
      this.logger.error('Reply notification failed', err);
    }

    return saved;
  }

  // ── Buyer: Delete own review ──────────────────────────────────────────────

  async deleteOwnReview(reviewId: string, reviewerId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review không tồn tại');
    if (review.reviewerId !== reviewerId) {
      throw new ForbiddenException('Bạn không có quyền xóa review này');
    }

    const { productId, revieweeId } = review;
    await this.reviewRepo.remove(review);

    if (productId) {
      try {
        await this.updateProductRating(productId);
      } catch (err) {
        this.logger.error('Failed to recompute product rating after delete', err);
      }
    }
    if (revieweeId) {
      try {
        await this.updateSellerTrustScore(revieweeId);
      } catch (err) {
        this.logger.error('Failed to recompute trust score after delete', err);
      }
    }
  }

  // ── Admin: Hide / Unhide ──────────────────────────────────────────────────

  async hideReview(reviewId: string, _adminId: string, reason: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review không tồn tại');

    review.isHidden = true;
    review.hiddenReason = reason;
    const saved = await this.reviewRepo.save(review);

    if (review.productId) {
      await this.updateProductRating(review.productId);
    }
    if (review.revieweeId) {
      await this.updateSellerTrustScore(review.revieweeId);
    }
    return saved;
  }

  async unhideReview(reviewId: string, _adminId: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review không tồn tại');

    review.isHidden = false;
    review.hiddenReason = null;
    const saved = await this.reviewRepo.save(review);

    if (review.productId) {
      await this.updateProductRating(review.productId);
    }
    if (review.revieweeId) {
      await this.updateSellerTrustScore(review.revieweeId);
    }
    return saved;
  }

  // ── Seller: My reviews ────────────────────────────────────────────────────

  async getReviewsBySeller(
    sellerId: string,
    filters: { replied?: boolean; page?: number; limit?: number },
  ): Promise<{ data: Review[]; total: number; page: number; limit: number }> {
    const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
    const limit = Number(filters.limit) > 0 ? Math.min(Number(filters.limit), 50) : 20;

    const whereBase = {
      revieweeId: sellerId,
      isHidden: false,
      ...(filters.replied === true
        ? { sellerReply: Not(IsNull()) }
        : filters.replied === false
        ? { sellerReply: IsNull() }
        : {}),
    };

    const [data, total] = await this.reviewRepo.findAndCount({
      where: whereBase,
      relations: ['reviewer', 'product'],
      select: {
        id: true,
        rating: true,
        comment: true,
        images: true,
        isVerifiedPurchase: true,
        sellerReply: true,
        sellerReplyAt: true,
        createdAt: true,
        reviewer: { id: true, fullName: true, avatarUrl: true },
        product: { id: true, name: true },
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  // ── Admin: All reviews ────────────────────────────────────────────────────

  async getAdminReviews(filters: {
    page?: number;
    limit?: number;
    isHidden?: boolean;
  }): Promise<{ data: Review[]; total: number; page: number; limit: number }> {
    const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
    const limit = Number(filters.limit) > 0 ? Math.min(Number(filters.limit), 50) : 20;

    const [data, total] = await this.reviewRepo.findAndCount({
      where: filters.isHidden !== undefined ? { isHidden: filters.isHidden } : {},
      relations: ['reviewer', 'product'],
      select: {
        id: true,
        rating: true,
        comment: true,
        isHidden: true,
        hiddenReason: true,
        isVerifiedPurchase: true,
        createdAt: true,
        reviewer: { id: true, fullName: true, avatarUrl: true },
        product: { id: true, name: true },
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  // ── Public: by product ────────────────────────────────────────────────────

  async getByProduct(
    productId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    data: Review[];
    total: number;
    page: number;
    limit: number;
    stats: RatingStats;
  }> {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 10;

    const [rows, total] = await this.reviewRepo.findAndCount({
      where: { productId, isHidden: false },
      relations: ['reviewer'],
      select: {
        id: true,
        rating: true,
        comment: true,
        images: true,
        isVerifiedPurchase: true,
        sellerReply: true,
        sellerReplyAt: true,
        createdAt: true,
        reviewer: { id: true, fullName: true, avatarUrl: true },
      },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    const data = rows.map((r) => ({
      ...r,
      reviewer: r.reviewer
        ? { ...r.reviewer, fullName: maskName(r.reviewer.fullName ?? 'Người dùng') }
        : r.reviewer,
    })) as Review[];

    const stats = await this.getRatingStats(productId);
    return { data, total, page: safePage, limit: safeLimit, stats };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async getRatingStats(productId: string): Promise<RatingStats> {
    const rows = await this.dataSource.query<Array<{ rating: string; count: string }>>(
      `SELECT rating::int AS rating, COUNT(*)::int AS count
         FROM reviews WHERE product_id = $1 AND is_hidden = false GROUP BY rating`,
      [productId],
    );

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalCount = 0;
    let ratingSum = 0;
    for (const row of rows) {
      const r = Number(row.rating);
      const c = Number(row.count);
      distribution[r] = c;
      totalCount += c;
      ratingSum += r * c;
    }

    return {
      avg: totalCount > 0 ? Math.round((ratingSum / totalCount) * 10) / 10 : 0,
      total: totalCount,
      distribution,
    };
  }

  async updateProductRating(productId: string): Promise<void> {
    const result = await this.dataSource.query<Array<{ avg: string | null; cnt: string }>>(
      `SELECT ROUND(AVG(rating)::numeric, 1) AS avg, COUNT(*)::int AS cnt
         FROM reviews WHERE product_id = $1 AND is_hidden = false`,
      [productId],
    );
    const avg = result[0]?.avg ? parseFloat(result[0].avg) : 0;
    await this.productRepo.update({ id: productId }, { avgRating: avg });
  }

  /**
   * Recompute the seller's trust_score on farmer_profiles based on:
   *   - average rating across all their products
   *   - total review count (weighted log scale)
   * Formula: trust_score = round(avg_rating * 20 + log10(review_count + 1) * 5, 1)
   * Max ~100 for sellers with high ratings and many reviews.
   */
  async updateSellerTrustScore(sellerId: string): Promise<void> {
    const rows = await this.dataSource.query<Array<{ avg: string | null; cnt: string }>>(
      `SELECT ROUND(AVG(rating)::numeric, 2) AS avg, COUNT(*)::int AS cnt
         FROM reviews WHERE reviewee_id = $1 AND is_hidden = false`,
      [sellerId],
    );
    const avg = rows[0]?.avg ? parseFloat(rows[0].avg) : 0;
    const cnt = rows[0]?.cnt ? Number(rows[0].cnt) : 0;
    const trustScore =
      Math.round((avg * 20 + Math.log10(cnt + 1) * 5) * 10) / 10;

    // farmer_profiles.user_id is unique; raw query keeps the service decoupled
    // from FarmerProfile entity (different sub-module).
    await this.dataSource.query(
      `UPDATE farmer_profiles
         SET trust_score = $1, updated_at = NOW()
         WHERE user_id = $2`,
      [trustScore, sellerId],
    );
  }
}
