import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto, ReplyReviewDto } from './dto/create-review.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
  ) {}

  async findByProduct(productId: string, pagination: PaginationDto): Promise<{ data: Review[]; total: number }> {
    const [data, total] = await this.reviewRepo.findAndCount({
      where: { productId },
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: pagination.skip,
    });
    return { data, total };
  }

  async create(reviewerId: string, dto: CreateReviewDto): Promise<Review> {
    const review = this.reviewRepo.create({ ...dto, reviewerId });
    return this.reviewRepo.save(review);
  }

  async reply(reviewId: string, sellerId: string, dto: ReplyReviewDto): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }
    review.reply = dto.reply;
    review.repliedAt = new Date();
    return this.reviewRepo.save(review);
  }
}
