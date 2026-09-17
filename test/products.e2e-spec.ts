import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import { Server } from 'http';
import * as request from 'supertest';

import {
  CertificationStatus,
  CertType,
  FarmingType,
  ProductStatus,
  ProductUnit,
  SellerType,
  UserRole,
} from '../src/common/enums';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { ProductsService } from '../src/modules/products/application/products.service';
import {
  ProductCategoryModel,
  ProductCertificationModel,
  ProductModel,
  WishlistModel,
} from '../src/modules/products/application/models/product.model';
import { ProductNotFoundError } from '../src/modules/products/domain/errors/product-application.error';
import { ProductsController } from '../src/modules/products/presentation/controllers/products.controller';
import { WishlistController } from '../src/modules/products/presentation/controllers/wishlist.controller';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const CERT_ID = '22222222-2222-4222-8222-222222222222';
const SELLER_ID = '33333333-3333-4333-8333-333333333333';
const ADMIN_ID = '66666666-6666-4666-8666-666666666666';
const CATEGORY_ID = '77777777-7777-4777-8777-777777777777';
const USER_ID = '55555555-5555-4555-8555-555555555555';

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    role: UserRole;
    sellerType?: SellerType;
  };
}

describe('Products REST contract (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  const productsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findCategories: jest.fn(),
    getCategoryTree: jest.fn(),
    findMine: jest.fn(),
    findPendingCertifications: jest.fn(),
    verifyCertification: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
    seedMockData: jest.fn(),
    resetAndSeed: jest.fn(),
    addImage: jest.fn(),
    removeImage: jest.fn(),
    addCertification: jest.fn(),
    removeCertification: jest.fn(),
    addToWishlist: jest.fn(),
    removeFromWishlist: jest.fn(),
    getWishlist: jest.fn(),
    getWishlistedIds: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController, WishlistController],
      providers: [{ provide: ProductsService, useValue: productsService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(testUserMiddleware);
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    productsService.create.mockResolvedValue(
      makeProduct({ status: ProductStatus.DRAFT }),
    );
    productsService.findAll.mockResolvedValue({
      data: [makeProduct()],
      total: 1,
    });
    productsService.findCategories.mockResolvedValue([makeCategory()]);
    productsService.getCategoryTree.mockResolvedValue([
      makeCategory({
        children: [
          makeCategory({
            id: CATEGORY_ID.replace('7', '8'),
            parentId: CATEGORY_ID,
          }),
        ],
      }),
    ]);
    productsService.findMine.mockResolvedValue({
      data: [makeProduct({ status: ProductStatus.DRAFT })],
      total: 1,
    });
    productsService.findPendingCertifications.mockResolvedValue([
      makeCertification(),
    ]);
    productsService.verifyCertification.mockResolvedValue(
      makeCertification({
        status: CertificationStatus.VERIFIED,
        isVerified: true,
        verifiedBy: ADMIN_ID,
        verifiedAt: new Date('2026-06-02T00:00:00.000Z'),
      }),
    );
    productsService.findOne.mockResolvedValue({
      id: PRODUCT_ID,
      name: 'Xoai cat Hoa Loc',
      status: ProductStatus.ACTIVE,
      seller: {
        id: SELLER_ID,
        phone: '0900000000',
        sellerType: SellerType.FARMER,
      },
    });
    productsService.update.mockResolvedValue(makeProduct({ name: 'Ten moi' }));
    productsService.updateStatus.mockResolvedValue(
      makeProduct({ status: ProductStatus.ACTIVE }),
    );
    productsService.remove.mockResolvedValue(undefined);
    productsService.addImage.mockResolvedValue({
      id: '99999999-9999-4999-8999-999999999999',
      productId: PRODUCT_ID,
      imageUrl: 'https://example.test/product.jpg',
      isPrimary: true,
    });
    productsService.addCertification.mockResolvedValue(makeCertification());
    productsService.addToWishlist.mockResolvedValue(makeWishlist());
    productsService.removeFromWishlist.mockResolvedValue(undefined);
    productsService.getWishlist.mockResolvedValue({
      data: [makeProduct()],
      total: 1,
      page: 1,
      limit: 20,
    });
    productsService.getWishlistedIds.mockResolvedValue([PRODUCT_ID]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /products forwards public filters and leaves currentUserId undefined for guests', async () => {
    const response = await request(server)
      .get('/products')
      .query({
        search: 'xoai',
        page: '2',
        limit: '5',
        sellerId: SELLER_ID,
        status: ProductStatus.DRAFT,
        isFeatured: 'true',
        sortBy: 'pricePerUnit',
        order: 'ASC',
      })
      .expect(200);

    expect(response.body.data.total).toBe(1);
    expect(productsService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'xoai',
        page: 2,
        limit: 5,
        sellerId: SELLER_ID,
        status: ProductStatus.DRAFT,
        isFeatured: true,
        sortBy: 'pricePerUnit',
        order: 'ASC',
      }),
      undefined,
    );
  });

  it('POST /products forwards authenticated role so application resolves sellerType', async () => {
    const body = {
      name: 'Xoai cat Hoa Loc',
      pricePerUnit: 25000,
      unit: ProductUnit.KG,
      availableQuantity: 100,
    };

    const response = await request(server)
      .post('/products')
      .set('Authorization', 'Bearer seller-token')
      .set('x-user-id', SELLER_ID)
      .set('x-user-role', UserRole.FARMER)
      .send(body)
      .expect(201);

    expect(response.body.data.status).toBe(ProductStatus.DRAFT);
    expect(productsService.create).toHaveBeenCalledWith(
      SELLER_ID,
      undefined,
      UserRole.FARMER,
      expect.objectContaining(body),
    );
  });

  it('maps a typed product error to its HTTP status', async () => {
    productsService.findOne.mockRejectedValueOnce(
      new ProductNotFoundError('Không tìm thấy sản phẩm'),
    );

    await request(server).get(`/products/${PRODUCT_ID}`).expect(404);
  });

  it('does not expose Product seed or reset operations as public endpoints', async () => {
    await request(server).post('/products/seed').expect(404);
    await request(server).post('/products/seed/reset').expect(404);
  });

  it('GET /products/me forwards seller-owned filters', async () => {
    await request(server)
      .get('/products/me')
      .set('Authorization', 'Bearer seller-token')
      .set('x-user-id', SELLER_ID)
      .set('x-user-role', UserRole.FARMER)
      .query({ status: ProductStatus.DRAFT })
      .expect(200);

    expect(productsService.findMine).toHaveBeenCalledWith(
      SELLER_ID,
      expect.objectContaining({ status: ProductStatus.DRAFT }),
    );
  });

  it('PATCH /products/:id/status forwards actor identity and requested status', async () => {
    await request(server)
      .patch(`/products/${PRODUCT_ID}/status`)
      .set('Authorization', 'Bearer admin-token')
      .set('x-user-id', ADMIN_ID)
      .set('x-user-role', UserRole.ADMIN)
      .send({ status: ProductStatus.ACTIVE })
      .expect(200);

    expect(productsService.updateStatus).toHaveBeenCalledWith(
      PRODUCT_ID,
      ADMIN_ID,
      UserRole.ADMIN,
      ProductStatus.ACTIVE,
    );
  });

  it('PATCH /products/certifications/:certId/verify forwards admin verification payload', async () => {
    await request(server)
      .patch(`/products/certifications/${CERT_ID}/verify`)
      .set('Authorization', 'Bearer admin-token')
      .set('x-user-id', ADMIN_ID)
      .set('x-user-role', UserRole.ADMIN)
      .send({ status: CertificationStatus.VERIFIED })
      .expect(200);

    expect(productsService.verifyCertification).toHaveBeenCalledWith(
      CERT_ID,
      ADMIN_ID,
      UserRole.ADMIN,
      { status: CertificationStatus.VERIFIED },
    );
  });

  it('POST /wishlist/:productId forwards authenticated user and product id', async () => {
    const response = await request(server)
      .post(`/wishlist/${PRODUCT_ID}`)
      .set('Authorization', 'Bearer user-token')
      .set('x-user-id', USER_ID)
      .set('x-user-role', UserRole.BUYER)
      .expect(201);

    expect(response.body.data.productId).toBe(PRODUCT_ID);
    expect(productsService.addToWishlist).toHaveBeenCalledWith(
      USER_ID,
      PRODUCT_ID,
    );
  });

  it('GET /wishlist returns paginated wishlist contract', async () => {
    const response = await request(server)
      .get('/wishlist?page=1&limit=20')
      .set('Authorization', 'Bearer user-token')
      .set('x-user-id', USER_ID)
      .set('x-user-role', UserRole.BUYER)
      .expect(200);

    expect(response.body.data).toMatchObject({
      total: 1,
      page: 1,
      limit: 20,
    });
    expect(productsService.getWishlist).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });
});

function testUserMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  if (req.headers.authorization) {
    req.user = {
      sub: headerValue(req, 'x-user-id') ?? USER_ID,
      role: (headerValue(req, 'x-user-role') as UserRole) ?? UserRole.BUYER,
      sellerType: headerValue(req, 'x-seller-type') as SellerType | undefined,
    };
  }
  next();
}

function headerValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function makeCategory(
  overrides: Partial<ProductCategoryModel> = {},
): ProductCategoryModel {
  return {
    id: CATEGORY_ID,
    name: 'Trai cay',
    slug: 'trai-cay',
    description: null,
    parentId: null,
    iconUrl: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    parent: null,
    children: [],
    ...overrides,
  } as ProductCategoryModel;
}

function makeProduct(overrides: Partial<ProductModel> = {}): ProductModel {
  return {
    id: PRODUCT_ID,
    sellerId: SELLER_ID,
    sellerType: SellerType.FARMER,
    name: 'Xoai cat Hoa Loc',
    description: 'Xoai tuoi',
    categoryId: CATEGORY_ID,
    sku: 'XCHL-001',
    variety: 'Hoa Loc',
    pricePerUnit: 25000,
    unit: ProductUnit.KG,
    availableQuantity: 100,
    minOrderQuantity: 5,
    status: ProductStatus.ACTIVE,
    farmingType: FarmingType.VIETGAP,
    provinceId: null,
    districtId: null,
    farmLatitude: null,
    farmLongitude: null,
    harvestDate: null,
    expiryDate: null,
    rejectionReason: null,
    isFeatured: false,
    viewCount: 0,
    soldCount: 0,
    avgRating: 0,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    category: makeCategory(),
    images: [],
    certifications: [],
    ...overrides,
  } as ProductModel;
}

function makeCertification(
  overrides: Partial<ProductCertificationModel> = {},
): ProductCertificationModel {
  return {
    id: CERT_ID,
    productId: PRODUCT_ID,
    certType: CertType.VIETGAP,
    certNumber: 'VG-001',
    issuedBy: 'Co quan chung nhan',
    issuedDate: null,
    expiryDate: null,
    storedFileId: '99999999-9999-4999-8999-999999999999',
    isVerified: false,
    status: CertificationStatus.PENDING,
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    product: makeProduct(),
    ...overrides,
  } as ProductCertificationModel;
}

function makeWishlist(overrides: Partial<WishlistModel> = {}): WishlistModel {
  return {
    id: '88888888-8888-4888-8888-888888888888',
    userId: USER_ID,
    productId: PRODUCT_ID,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    product: makeProduct(),
    ...overrides,
  } as WishlistModel;
}
