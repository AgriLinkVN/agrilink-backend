import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Review } from '../../persistence/entities/review.entity';
import {
  ReviewDevSeedRecord,
  ReviewDevSeedWriteData,
  ReviewDevSeedWriter,
} from './review-development-seed.service';

@Injectable()
export class TypeOrmReviewDevSeedWriter implements ReviewDevSeedWriter {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  findReviewsByReviewerAndProduct(
    reviewerId: string,
    productId: string,
  ): Promise<readonly ReviewDevSeedRecord[]> {
    return this.reviewRepository.find({
      select: { id: true },
      where: { reviewerId, productId },
    });
  }

  async createReview(data: ReviewDevSeedWriteData): Promise<void> {
    await this.reviewRepository.save(this.reviewRepository.create(data));
  }

  async updateReview(id: string, data: ReviewDevSeedWriteData): Promise<void> {
    await this.reviewRepository.update(id, data);
  }
}
