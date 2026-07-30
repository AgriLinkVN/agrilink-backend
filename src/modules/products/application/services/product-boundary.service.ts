import { Inject, Injectable } from '@nestjs/common';

import { ProductStatus } from '@common/enums';
import {
  PRODUCT_ADMIN_QUERY,
  PRODUCT_MODERATION_REPOSITORY,
  PRODUCT_REVIEW_QUERY,
  ProductAdminQueryPort,
  ProductModerationRepositoryPort,
  ProductReviewQueryPort,
} from '../ports/outbound/product-repository.port';
import {
  ProductAdminPage,
  ProductAdminReader,
  ProductModerationManager,
  ProductModerationResult,
} from '../ports/inbound/product-admin.port';
import {
  ProductReviewContext,
  ProductReviewReader,
  ProductReviewSummary,
} from '../ports/inbound/product-review.port';

const MODERATION_TARGETS = new Set([
  ProductStatus.ACTIVE,
  ProductStatus.REJECTED,
  ProductStatus.SUSPENDED,
]);

@Injectable()
export class ProductBoundaryService
  implements ProductReviewReader, ProductAdminReader, ProductModerationManager
{
  constructor(
    @Inject(PRODUCT_REVIEW_QUERY)
    private readonly reviewQuery: ProductReviewQueryPort,
    @Inject(PRODUCT_ADMIN_QUERY)
    private readonly adminQuery: ProductAdminQueryPort,
    @Inject(PRODUCT_MODERATION_REPOSITORY)
    private readonly moderationRepository: ProductModerationRepositoryPort,
  ) {}

  findReviewContext(productId: string): Promise<ProductReviewContext | null> {
    return this.reviewQuery.findReviewContext(productId);
  }

  findReviewSummariesByIds(
    ids: string[],
  ): Promise<ProductReviewSummary[]> {
    return this.reviewQuery.findReviewSummariesByIds(ids);
  }

  countAll(): Promise<number> {
    return this.adminQuery.countAllProducts();
  }

  countPending(): Promise<number> {
    return this.adminQuery.countProductsByStatus(
      ProductStatus.PENDING_APPROVAL,
    );
  }

  findDetail(id: string) {
    return this.adminQuery.findAdminProduct(id);
  }

  listPending(skip: number, take: number): Promise<ProductAdminPage> {
    return this.adminQuery.findAdminProductsByStatuses(
      [ProductStatus.PENDING_APPROVAL],
      skip,
      take,
      'createdAt',
    );
  }

  listViolating(skip: number, take: number): Promise<ProductAdminPage> {
    return this.adminQuery.findAdminProductsByStatuses(
      [ProductStatus.SUSPENDED, ProductStatus.REJECTED],
      skip,
      take,
      'updatedAt',
    );
  }

  async moderate(
    id: string,
    status: string,
    reason: string | null,
  ): Promise<ProductModerationResult> {
    if (!MODERATION_TARGETS.has(status as ProductStatus)) {
      return { outcome: 'invalid-target' };
    }

    const current = await this.adminQuery.findAdminProduct(id);
    if (!current) {
      return { outcome: 'not-found' };
    }

    const nextStatus = status as ProductStatus;
    if (current.status === nextStatus) {
      return {
        outcome: 'updated',
        previousStatus: current.status,
        product: current,
      };
    }

    const updated = await this.moderationRepository.updateStatusConditionally(
      id,
      current.status,
      nextStatus,
      nextStatus === ProductStatus.REJECTED ? reason : null,
    );
    return updated
      ? {
          outcome: 'updated',
          previousStatus: current.status,
          product: updated,
        }
      : { outcome: 'conflict' };
  }
}
