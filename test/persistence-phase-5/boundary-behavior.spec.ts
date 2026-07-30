import { ProductStatus } from '../../src/common/enums';
import { ProductBoundaryService } from '../../src/modules/products/application/services/product-boundary.service';
import { ReviewReadModelService } from '../../src/modules/reviews/application/services/review-read-model.service';
import { TypeOrmReviewsRepository } from '../../src/modules/reviews/infrastructure/persistence/repositories/typeorm-reviews.repository';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const REVIEWER_ID = '22222222-2222-4222-8222-222222222222';
const SELLER_ID = '33333333-3333-4333-8333-333333333333';

describe('Persistence Phase 5 boundary behavior', () => {
  it('allows only one concurrent product moderation winner', async () => {
    const current = {
      id: PRODUCT_ID,
      sellerId: SELLER_ID,
      status: ProductStatus.PENDING_APPROVAL,
    };
    const adminQuery = {
      findAdminProduct: jest.fn().mockResolvedValue(current),
    };
    const moderationRepository = {
      updateStatusConditionally: jest
        .fn()
        .mockResolvedValueOnce({ ...current, status: ProductStatus.ACTIVE })
        .mockResolvedValueOnce(null),
    };
    const service = new ProductBoundaryService(
      {} as never,
      adminQuery as never,
      moderationRepository as never,
    );

    const results = await Promise.all([
      service.moderate(PRODUCT_ID, ProductStatus.ACTIVE, null),
      service.moderate(PRODUCT_ID, ProductStatus.ACTIVE, null),
    ]);

    expect(results.map(({ outcome }) => outcome).sort()).toEqual([
      'conflict',
      'updated',
    ]);
    expect(moderationRepository.updateStatusConditionally).toHaveBeenCalledTimes(
      2,
    );
  });

  it('batch-composes N reviews with one Products and one Users lookup', async () => {
    const products = {
      findReviewSummariesByIds: jest.fn().mockResolvedValue([
        { id: PRODUCT_ID, name: 'Xoai cat' },
      ]),
    };
    const users = {
      findReviewSummariesByIds: jest.fn().mockResolvedValue([
        {
          id: REVIEWER_ID,
          fullName: 'Nguyen Van A',
          avatarUrl: null,
        },
      ]),
    };
    const service = new ReviewReadModelService(
      products as never,
      users as never,
    );
    const reviews = Array.from({ length: 20 }, (_, index) => ({
      id: `${index}`,
      reviewerId: REVIEWER_ID,
      revieweeId: SELLER_ID,
      productId: PRODUCT_ID,
      rating: 5,
      comment: null,
      images: [],
      isVerifiedPurchase: false,
      sellerReply: null,
      sellerReplyAt: null,
      isHidden: false,
      hiddenReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await service.compose(reviews, {
      includeReviewer: true,
      includeProduct: true,
    });

    expect(result).toHaveLength(20);
    expect(products.findReviewSummariesByIds).toHaveBeenCalledTimes(1);
    expect(products.findReviewSummariesByIds).toHaveBeenCalledWith([
      PRODUCT_ID,
    ]);
    expect(users.findReviewSummariesByIds).toHaveBeenCalledTimes(1);
    expect(users.findReviewSummariesByIds).toHaveBeenCalledWith([REVIEWER_ID]);
  });

  it('turns a database duplicate review into a deterministic conflict result', async () => {
    const databaseError = Object.assign(new Error('duplicate'), {
      code: '23505',
    });
    const reviews = {
      create: jest.fn((input) => input),
      save: jest.fn().mockRejectedValue(databaseError),
    };
    const repository = new TypeOrmReviewsRepository(reviews as never);

    await expect(
      repository.createIfAbsent({
        productId: PRODUCT_ID,
        reviewerId: REVIEWER_ID,
        revieweeId: SELLER_ID,
        rating: 5,
        comment: null,
        images: [],
      }),
    ).resolves.toBeNull();
  });
});
