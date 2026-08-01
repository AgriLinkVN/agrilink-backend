import {
  ProductForReviewNotFoundError,
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
  ReviewerNotEligibleError,
} from '../errors/reviews-application.error';
import { ReviewsRepositoryPort } from '../ports/outbound/reviews-repository.port';
import {
  CreateProductReviewUseCase,
  HideReviewUseCase,
  ListPublicProductReviewsUseCase,
  ReplyToReviewUseCase,
  UnhideReviewUseCase,
} from './reviews.use-cases';
import {
  ReviewOwnershipError,
  ReviewStateError,
} from '../../domain/errors/review-domain.error';
import { UserStatus } from '@common/enums';

const REVIEW_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';
const BUYER_ID = '33333333-3333-4333-8333-333333333333';
const SELLER_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_SELLER_ID = '55555555-5555-4555-8555-555555555555';

function makeReview(overrides = {}) {
  return {
    id: REVIEW_ID,
    reviewerId: BUYER_ID,
    revieweeId: SELLER_ID,
    productId: PRODUCT_ID,
    rating: 5,
    comment: 'Sản phẩm rất tốt',
    images: [],
    isVerifiedPurchase: false,
    sellerReply: null,
    sellerReplyAt: null,
    isHidden: false,
    hiddenReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createRepository(): jest.Mocked<ReviewsRepositoryPort> {
  return {
    createIfAbsent: jest.fn(),
    findById: jest.fn(),
    findPublicByProduct: jest.fn(),
    findForSeller: jest.fn(),
    findForModeration: jest.fn(),
    saveReplyIfUnreplied: jest.fn(),
    setVisibility: jest.fn(),
  };
}

function createReadModel() {
  return {
    compose: jest.fn(async (reviews) => reviews),
    composeOne: jest.fn(async (review) => review),
  };
}

function createProducts() {
  return {
    findReviewContext: jest.fn(),
    findReviewSummariesByIds: jest.fn().mockResolvedValue([]),
  };
}

function createUsers() {
  return {
    findReviewEligibility: jest.fn().mockResolvedValue({
      id: BUYER_ID,
      status: UserStatus.ACTIVE,
    }),
    findReviewSummariesByIds: jest.fn().mockResolvedValue([]),
  };
}

describe('Reviews use cases', () => {
  it('returns public product reviews through the repository port', async () => {
    const repository = createRepository();
    repository.findPublicByProduct.mockResolvedValue({
      data: [makeReview()],
      total: 1,
      page: 1,
      limit: 10,
      stats: { avg: 5, total: 1, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } },
    });
    const useCase = new ListPublicProductReviewsUseCase(
      repository,
      createReadModel() as never,
    );

    await expect(useCase.execute(PRODUCT_ID, { page: 1, limit: 10 })).resolves.toMatchObject({
      total: 1,
    });
  });

  it('creates one review using the product seller as reviewee', async () => {
    const repository = createRepository();
    const products = createProducts();
    const users = createUsers();
    products.findReviewContext.mockResolvedValue({
      id: PRODUCT_ID,
      sellerId: SELLER_ID,
      name: 'Xoài cát',
    });
    repository.createIfAbsent.mockResolvedValue(makeReview());
    const useCase = new CreateProductReviewUseCase(
      repository,
      products,
      users,
    );

    await expect(
      useCase.execute(BUYER_ID, {
        productId: PRODUCT_ID,
        rating: 5,
        comment: 'Sản phẩm rất tốt',
        images: [],
      }),
    ).resolves.toMatchObject({ id: REVIEW_ID });
    expect(repository.createIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({ reviewerId: BUYER_ID, revieweeId: SELLER_ID }),
    );
  });

  it('marks a review verified only through CompletedPurchaseReader', async () => {
    const repository = createRepository();
    const products = createProducts();
    const users = createUsers();
    const completedPurchases = { isEligible: jest.fn().mockResolvedValue(true) };
    products.findReviewContext.mockResolvedValue({
      id: PRODUCT_ID,
      sellerId: SELLER_ID,
      name: 'Xoai cat',
    });
    repository.createIfAbsent.mockImplementation(async (input) =>
      makeReview({ isVerifiedPurchase: input.isVerifiedPurchase }),
    );
    const useCase = new CreateProductReviewUseCase(
      repository,
      products,
      users,
      completedPurchases,
    );

    await expect(
      useCase.execute(BUYER_ID, {
        productId: PRODUCT_ID,
        rating: 5,
        comment: null,
        images: [],
      }),
    ).resolves.toMatchObject({ isVerifiedPurchase: true });
    expect(completedPurchases.isEligible).toHaveBeenCalledWith(
      BUYER_ID,
      PRODUCT_ID,
    );
    expect(repository.createIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({ isVerifiedPurchase: true }),
    );
  });

  it('rejects missing products, self reviews, and duplicate reviews', async () => {
    const repository = createRepository();
    const products = createProducts();
    const users = createUsers();
    const useCase = new CreateProductReviewUseCase(
      repository,
      products,
      users,
    );

    products.findReviewContext.mockResolvedValueOnce(null);
    await expect(
      useCase.execute(BUYER_ID, { productId: PRODUCT_ID, rating: 5, comment: null, images: [] }),
    ).rejects.toThrow(ProductForReviewNotFoundError);

    products.findReviewContext.mockResolvedValueOnce({
      id: PRODUCT_ID,
      sellerId: BUYER_ID,
      name: 'Xoài cát',
    });
    await expect(
      useCase.execute(BUYER_ID, { productId: PRODUCT_ID, rating: 5, comment: null, images: [] }),
    ).rejects.toThrow(ReviewOwnershipError);

    products.findReviewContext.mockResolvedValueOnce({
      id: PRODUCT_ID,
      sellerId: SELLER_ID,
      name: 'Xoài cát',
    });
    repository.createIfAbsent.mockResolvedValueOnce(null);
    await expect(
      useCase.execute(BUYER_ID, { productId: PRODUCT_ID, rating: 5, comment: null, images: [] }),
    ).rejects.toThrow(ReviewAlreadyExistsError);
  });

  it('rejects reviewers that are missing or not active', async () => {
    const repository = createRepository();
    const products = createProducts();
    const users = createUsers();
    products.findReviewContext.mockResolvedValue({
      id: PRODUCT_ID,
      sellerId: SELLER_ID,
      name: 'Xoài cát',
    });
    const useCase = new CreateProductReviewUseCase(
      repository,
      products,
      users,
    );

    users.findReviewEligibility.mockResolvedValueOnce(null);
    await expect(
      useCase.execute(BUYER_ID, {
        productId: PRODUCT_ID,
        rating: 5,
        comment: null,
        images: [],
      }),
    ).rejects.toThrow(ReviewerNotEligibleError);

    users.findReviewEligibility.mockResolvedValueOnce({
      id: BUYER_ID,
      status: UserStatus.LOCKED,
    });
    await expect(
      useCase.execute(BUYER_ID, {
        productId: PRODUCT_ID,
        rating: 5,
        comment: null,
        images: [],
      }),
    ).rejects.toThrow(ReviewerNotEligibleError);

    expect(repository.createIfAbsent).not.toHaveBeenCalled();
  });

  it('only lets the reviewee save the first reply', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(makeReview());
    repository.saveReplyIfUnreplied.mockResolvedValue(
      makeReview({ sellerReply: 'Cảm ơn bạn', sellerReplyAt: new Date() }),
    );
    const useCase = new ReplyToReviewUseCase(
      repository,
      createReadModel() as never,
    );

    await expect(useCase.execute(REVIEW_ID, SELLER_ID, '  Cảm ơn bạn  ')).resolves.toMatchObject({
      sellerReply: 'Cảm ơn bạn',
    });
    expect(repository.saveReplyIfUnreplied).toHaveBeenCalledWith(
      REVIEW_ID,
      SELLER_ID,
      'Cảm ơn bạn',
      expect.any(Date),
    );

    await expect(useCase.execute(REVIEW_ID, OTHER_SELLER_ID, 'Cảm ơn bạn')).rejects.toThrow(
      ReviewOwnershipError,
    );

    repository.findById.mockResolvedValue(makeReview({ sellerReply: 'Đã trả lời' }));
    await expect(useCase.execute(REVIEW_ID, SELLER_ID, 'Lần nữa')).rejects.toThrow(
      ReviewStateError,
    );
  });

  it('changes review visibility only once per transition', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(makeReview());
    repository.setVisibility.mockResolvedValue(makeReview({ isHidden: true }));
    const hide = new HideReviewUseCase(
      repository,
      createReadModel() as never,
    );

    await expect(hide.execute(REVIEW_ID, OTHER_SELLER_ID, 'Nội dung vi phạm')).resolves.toMatchObject({
      isHidden: true,
    });
    expect(repository.setVisibility).toHaveBeenCalledWith(
      REVIEW_ID,
      false,
      true,
      'Nội dung vi phạm',
      OTHER_SELLER_ID,
      expect.any(Date),
    );

    repository.findById.mockResolvedValue(makeReview({ isHidden: true }));
    await expect(hide.execute(REVIEW_ID, OTHER_SELLER_ID, 'Nội dung vi phạm')).rejects.toThrow(
      ReviewStateError,
    );

    const unhide = new UnhideReviewUseCase(
      repository,
      createReadModel() as never,
    );
    repository.setVisibility.mockResolvedValue(makeReview({ isHidden: false }));
    await expect(unhide.execute(REVIEW_ID)).resolves.toMatchObject({ isHidden: false });

    repository.findById.mockResolvedValue(null);
    await expect(unhide.execute(REVIEW_ID)).rejects.toThrow(ReviewNotFoundError);
  });
});
