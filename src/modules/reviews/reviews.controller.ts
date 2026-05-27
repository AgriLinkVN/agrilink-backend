import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReplyReviewDto } from './dto/create-review.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('product/:id')
  @ApiOperation({ summary: 'Get all reviews for a product (public)' })
  @ApiResponse({ status: 200, description: 'Paginated reviews' })
  findByProduct(
    @Param('id', ParseUuidPipe) productId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.reviewsService.findByProduct(productId, pagination);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Submit a product review' })
  @ApiResponse({ status: 201, description: 'Review submitted' })
  create(
    @CurrentUser('sub') reviewerId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(reviewerId, dto);
  }

  @Patch(':id/reply')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add or update seller reply to a review' })
  @ApiResponse({ status: 200, description: 'Reply saved' })
  reply(
    @Param('id', ParseUuidPipe) reviewId: string,
    @CurrentUser('sub') sellerId: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.reply(reviewId, sellerId, dto);
  }
}
