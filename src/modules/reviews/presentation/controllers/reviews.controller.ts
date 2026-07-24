import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/enums';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import {
  CreateProductReviewUseCase,
  HideReviewUseCase,
  ListPublicProductReviewsUseCase,
  ListReviewsForModerationUseCase,
  ListSellerReviewsUseCase,
  ReplyToReviewUseCase,
  UnhideReviewUseCase,
} from '../../application/use-cases/reviews.use-cases';
import { TrustScoreService } from '../../application/trust-score.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import { HideReviewDto } from '../dto/moderate-review.dto';
import {
  AdminReviewQueryDto,
  ReviewPaginationDto,
  SellerReviewQueryDto,
} from '../dto/review-query.dto';
import { ReplyReviewDto } from '../dto/reply-review.dto';
import { mapReviewsApplicationError } from '../mappers/reviews-error.mapper';
import {
  presentPublicReviewList,
  presentReview,
  presentReviewList,
} from '../mappers/review-response.mapper';

@ApiTags('Reviews')
@ApiBearerAuth('access-token')
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly listPublicReviews: ListPublicProductReviewsUseCase,
    private readonly createReview: CreateProductReviewUseCase,
    private readonly listSellerReviews: ListSellerReviewsUseCase,
    private readonly replyToReview: ReplyToReviewUseCase,
    private readonly listModerationReviews: ListReviewsForModerationUseCase,
    private readonly hideReview: HideReviewUseCase,
    private readonly unhideReview: UnhideReviewUseCase,
    private readonly trustScoreService: TrustScoreService,
  ) {}

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return mapReviewsApplicationError(error);
    }
  }

  @Public()
  @Get('product/:id')
  @ApiOperation({ summary: 'Danh sách đánh giá public của sản phẩm' })
  getPublicReviews(
    @Param('id', ParseUuidPipe) productId: string,
    @Query() query: ReviewPaginationDto,
  ) {
    return this.execute(async () =>
      presentPublicReviewList(await this.listPublicReviews.execute(productId, query)),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.BUYER)
  @ApiOperation({ summary: 'Buyer tạo một đánh giá cho mỗi sản phẩm' })
  @ApiResponse({ status: 409, description: 'Đã đánh giá hoặc review không hợp lệ' })
  create(
    @CurrentUser('sub') reviewerId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.execute(async () =>
      presentReview(
        await this.createReview.execute(reviewerId, {
          productId: dto.productId,
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
          images: dto.images ?? [],
        }),
      ),
    );
  }

  @Get('seller/me')
  @Roles(UserRole.FARMER, UserRole.COOPERATIVE, UserRole.SUPPLIER)
  @ApiOperation({ summary: 'Inbox đánh giá của seller hiện tại' })
  getSellerReviews(
    @CurrentUser('sub') sellerId: string,
    @Query() query: SellerReviewQueryDto,
  ) {
    return this.execute(async () =>
      presentReviewList(await this.listSellerReviews.execute(sellerId, query)),
    );
  }

  @Patch(':id/reply')
  @Roles(UserRole.FARMER, UserRole.COOPERATIVE, UserRole.SUPPLIER)
  @ApiOperation({ summary: 'Seller phản hồi một lần cho đánh giá' })
  reply(
    @Param('id', ParseUuidPipe) reviewId: string,
    @CurrentUser('sub') sellerId: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.execute(async () =>
      presentReview(await this.replyToReview.execute(reviewId, sellerId, dto.reply)),
    );
  }

  @Get('admin/reviews')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Danh sách đánh giá để admin kiểm duyệt' })
  getModerationReviews(@Query() query: AdminReviewQueryDto) {
    return this.execute(async () =>
      presentReviewList(
        await this.listModerationReviews.execute({
          page: query.page,
          limit: query.limit,
          isHidden: query.is_hidden,
        }),
      ),
    );
  }

  @Patch('admin/reviews/:id/hide')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin ẩn đánh giá vi phạm' })
  hide(
    @Param('id', ParseUuidPipe) reviewId: string,
    @CurrentUser('sub') adminId: string,
    @Body() dto: HideReviewDto,
  ) {
    return this.execute(async () =>
      presentReview(await this.hideReview.execute(reviewId, adminId, dto.reason)),
    );
  }

  @Patch('admin/reviews/:id/unhide')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin khôi phục đánh giá đã ẩn' })
  unhide(@Param('id', ParseUuidPipe) reviewId: string) {
    return this.execute(async () => presentReview(await this.unhideReview.execute(reviewId)));
  }

  @Public()
  @Get('seller/:id/trust')
  @ApiOperation({ summary: 'Điểm tin cậy của người bán (public)' })
  async getSellerTrustScore(@Param('id', ParseUuidPipe) sellerId: string) {
    const score = await this.trustScoreService.getTrustScore(sellerId);
    return { data: { seller_id: sellerId, trust_score: score } };
  }
}
