import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import {
  CreateReviewDto,
  HideReviewDto,
  ReplyReviewDto,
} from './dto/create-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { UserRole } from '../../common/enums';

@ApiTags('Reviews')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ── Public: get reviews for a product ─────────────────────────────────────

  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Get reviews for a product (public)' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  getByProduct(
    @Param('productId', ParseUuidPipe) productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.getByProduct(
      productId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  // ── Authenticated: submit a review ────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a product review (logged in)' })
  @ApiResponse({ status: 201, description: 'Review submitted' })
  @ApiResponse({ status: 409, description: 'Already reviewed' })
  createReview(
    @CurrentUser('sub') reviewerId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(reviewerId, dto);
  }

  // ── Authenticated: delete own review ──────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete your own review' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 403, description: 'Not your review' })
  deleteOwnReview(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') reviewerId: string,
  ) {
    return this.reviewsService.deleteOwnReview(id, reviewerId);
  }

  // ── Seller / farmer / cooperative: reply ──────────────────────────────────

  @Patch(':id/reply')
  @Roles(UserRole.farmer, UserRole.cooperative, UserRole.supplier)
  @ApiOperation({ summary: '[Seller] Reply to a review (one-time)' })
  @ApiResponse({ status: 200, description: 'Reply saved' })
  @ApiResponse({ status: 409, description: 'Already replied' })
  replyReview(
    @Param('id', ParseUuidPipe) reviewId: string,
    @CurrentUser('sub') sellerId: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.replyReview(reviewId, sellerId, dto.reply);
  }

  // ── Seller: my reviews inbox ──────────────────────────────────────────────

  @Get('seller/me')
  @Roles(UserRole.farmer, UserRole.cooperative, UserRole.supplier)
  @ApiOperation({ summary: '[Seller] Get reviews addressed to me' })
  @ApiQuery({ name: 'replied', type: Boolean, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  getReviewsBySeller(
    @CurrentUser('sub') sellerId: string,
    @Query('replied') replied?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const repliedBool =
      replied === 'true' ? true : replied === 'false' ? false : undefined;
    return this.reviewsService.getReviewsBySeller(sellerId, {
      replied: repliedBool,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  // ── Admin: list all reviews ───────────────────────────────────────────────

  @Get('admin/reviews')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] List all reviews with optional filter' })
  @ApiQuery({ name: 'is_hidden', type: Boolean, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  getAdminReviews(
    @Query('is_hidden') isHidden?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const isHiddenBool =
      isHidden === 'true' ? true : isHidden === 'false' ? false : undefined;
    return this.reviewsService.getAdminReviews({
      isHidden: isHiddenBool,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  // ── Admin: hide a review ──────────────────────────────────────────────────

  @Patch('admin/reviews/:id/hide')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] Hide a review' })
  hideReview(
    @Param('id', ParseUuidPipe) reviewId: string,
    @CurrentUser('sub') adminId: string,
    @Body() dto: HideReviewDto,
  ) {
    return this.reviewsService.hideReview(reviewId, adminId, dto.reason);
  }

  // ── Admin: unhide a review ────────────────────────────────────────────────

  @Patch('admin/reviews/:id/unhide')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: '[Admin] Unhide a review' })
  unhideReview(
    @Param('id', ParseUuidPipe) reviewId: string,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.reviewsService.unhideReview(reviewId, adminId);
  }
}
