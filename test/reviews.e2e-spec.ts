import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import { Server } from 'http';
import * as request from 'supertest';

import { UserRole } from '../src/common/enums';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import {
  CreateProductReviewUseCase,
  HideReviewUseCase,
  ListPublicProductReviewsUseCase,
  ListReviewsForModerationUseCase,
  ListSellerReviewsUseCase,
  ReplyToReviewUseCase,
  UnhideReviewUseCase,
} from '../src/modules/reviews/application/use-cases/reviews.use-cases';
import { ReviewsController } from '../src/modules/reviews/presentation/controllers/reviews.controller';

const REVIEW_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';
const BUYER_ID = '33333333-3333-4333-8333-333333333333';
const SELLER_ID = '44444444-4444-4444-8444-444444444444';
const ADMIN_ID = '55555555-5555-4555-8555-555555555555';

describe('Reviews REST contract (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  const listPublicReviews = { execute: jest.fn() };
  const createReview = { execute: jest.fn() };
  const listSellerReviews = { execute: jest.fn() };
  const replyToReview = { execute: jest.fn() };
  const listModerationReviews = { execute: jest.fn() };
  const hideReview = { execute: jest.fn() };
  const unhideReview = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        { provide: ListPublicProductReviewsUseCase, useValue: listPublicReviews },
        { provide: CreateProductReviewUseCase, useValue: createReview },
        { provide: ListSellerReviewsUseCase, useValue: listSellerReviews },
        { provide: ReplyToReviewUseCase, useValue: replyToReview },
        { provide: ListReviewsForModerationUseCase, useValue: listModerationReviews },
        { provide: HideReviewUseCase, useValue: hideReview },
        { provide: UnhideReviewUseCase, useValue: unhideReview },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(testUserMiddleware);
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    listPublicReviews.execute.mockResolvedValue(makePublicList());
    createReview.execute.mockResolvedValue(makeReview());
    listSellerReviews.execute.mockResolvedValue(makeList());
    replyToReview.execute.mockResolvedValue(makeReview({ sellerReply: 'Cảm ơn bạn' }));
    listModerationReviews.execute.mockResolvedValue(makeList());
    hideReview.execute.mockResolvedValue(makeReview({ isHidden: true }));
    unhideReview.execute.mockResolvedValue(makeReview({ isHidden: false }));
  });

  afterAll(async () => app.close());

  it('GET /reviews/product/:id exposes paginated public reviews and stats', async () => {
    const response = await request(server)
      .get(`/reviews/product/${PRODUCT_ID}?page=2&limit=10`)
      .expect(200);

    expect(response.body.data.stats).toMatchObject({ avg: 5, total: 1 });
    expect(listPublicReviews.execute).toHaveBeenCalledWith(PRODUCT_ID, { page: 2, limit: 10 });
  });

  it('POST /reviews forwards the buyer payload', async () => {
    const payload = { productId: PRODUCT_ID, rating: 5, comment: 'Rất ngon', images: [] };
    await request(server)
      .post('/reviews')
      .set('Authorization', 'Bearer buyer-token')
      .set('x-user-id', BUYER_ID)
      .set('x-user-role', UserRole.BUYER)
      .send(payload)
      .expect(201);

    expect(createReview.execute).toHaveBeenCalledWith(BUYER_ID, payload);
  });

  it('GET /reviews/seller/me forwards replied filter and pagination', async () => {
    await request(server)
      .get('/reviews/seller/me?replied=false&page=2')
      .set('Authorization', 'Bearer seller-token')
      .set('x-user-id', SELLER_ID)
      .set('x-user-role', UserRole.FARMER)
      .expect(200);

    expect(listSellerReviews.execute).toHaveBeenCalledWith(SELLER_ID, {
      replied: false,
      page: 2,
      limit: 20,
    });
  });

  it('rejects invalid boolean review filters', async () => {
    await request(server)
      .get('/reviews/seller/me?replied=not-a-boolean')
      .set('Authorization', 'Bearer seller-token')
      .set('x-user-id', SELLER_ID)
      .set('x-user-role', UserRole.FARMER)
      .expect(400);

    expect(listSellerReviews.execute).not.toHaveBeenCalled();
  });

  it('PATCH /reviews/:id/reply forwards the seller reply', async () => {
    await request(server)
      .patch(`/reviews/${REVIEW_ID}/reply`)
      .set('Authorization', 'Bearer seller-token')
      .set('x-user-id', SELLER_ID)
      .set('x-user-role', UserRole.SUPPLIER)
      .send({ reply: 'Cảm ơn bạn' })
      .expect(200);

    expect(replyToReview.execute).toHaveBeenCalledWith(REVIEW_ID, SELLER_ID, 'Cảm ơn bạn');
  });

  it('admin moderation routes forward filters and decisions', async () => {
    await request(server)
      .get('/reviews/admin/reviews?is_hidden=true&page=2')
      .set('Authorization', 'Bearer admin-token')
      .set('x-user-id', ADMIN_ID)
      .set('x-user-role', UserRole.ADMIN)
      .expect(200);
    expect(listModerationReviews.execute).toHaveBeenCalledWith({
      isHidden: true,
      page: 2,
      limit: 20,
    });

    await request(server)
      .patch(`/reviews/admin/reviews/${REVIEW_ID}/hide`)
      .set('Authorization', 'Bearer admin-token')
      .set('x-user-id', ADMIN_ID)
      .set('x-user-role', UserRole.ADMIN)
      .send({ reason: 'Nội dung vi phạm' })
      .expect(200);
    expect(hideReview.execute).toHaveBeenCalledWith(REVIEW_ID, ADMIN_ID, 'Nội dung vi phạm');

    await request(server)
      .patch(`/reviews/admin/reviews/${REVIEW_ID}/unhide`)
      .set('Authorization', 'Bearer admin-token')
      .set('x-user-id', ADMIN_ID)
      .set('x-user-role', UserRole.ADMIN)
      .expect(200);
    expect(unhideReview.execute).toHaveBeenCalledWith(REVIEW_ID);
  });
});

function testUserMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.headers.authorization) {
    (req as Request & { user: { sub: string; role: UserRole } }).user = {
      sub: (req.headers['x-user-id'] as string | undefined) ?? BUYER_ID,
      role: (req.headers['x-user-role'] as UserRole | undefined) ?? UserRole.BUYER,
    };
  }
  next();
}

function makeReview(overrides = {}) {
  return {
    id: REVIEW_ID,
    reviewerId: BUYER_ID,
    revieweeId: SELLER_ID,
    productId: PRODUCT_ID,
    rating: 5,
    comment: 'Rất ngon',
    images: [],
    isVerifiedPurchase: false,
    sellerReply: null,
    sellerReplyAt: null,
    isHidden: false,
    hiddenReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    reviewer: { id: BUYER_ID, fullName: 'Nguyễn Văn A', avatarUrl: null },
    product: { id: PRODUCT_ID, name: 'Xoài cát' },
    ...overrides,
  };
}

function makeList() {
  return { data: [makeReview()], total: 1, page: 1, limit: 20 };
}

function makePublicList() {
  return {
    ...makeList(),
    limit: 10,
    stats: { avg: 5, total: 1, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } },
  };
}
