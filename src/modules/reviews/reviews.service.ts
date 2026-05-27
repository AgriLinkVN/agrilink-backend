import { Injectable } from '@nestjs/common';
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
    throw new Error('TODO: implement ReviewsService.findByProduct()');
  }

  async create(reviewerId: string, dto: CreateReviewDto): Promise<Review> {
    throw new Error('TODO: implement ReviewsService.create()');
  }

  async reply(reviewId: string, sellerId: string, dto: ReplyReviewDto): Promise<Review> {
    throw new Error('TODO: implement ReviewsService.reply()');
  }
}
