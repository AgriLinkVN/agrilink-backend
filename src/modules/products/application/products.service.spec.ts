import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  CertificationStatus,
  CertType,
  FarmingType,
  NotifType,
  ProductStatus,
  ProductUnit,
  SellerType,
  UserRole,
} from '@common/enums';
import { ProductsService } from './products.service';
import { Product } from '../domain/entities/product.entity';
import { ProductCertification } from '../domain/entities/product-certification.entity';
import { ProductCategory } from '../domain/entities/product-category.entity';
import { ProductImage } from '../domain/entities/product-image.entity';
import { Wishlist } from '../domain/entities/wishlist.entity';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const CERT_ID = '22222222-2222-4222-8222-222222222222';
const SELLER_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_SELLER_ID = '44444444-4444-4444-8444-444444444444';
const USER_ID = '55555555-5555-4555-8555-555555555555';
const ADMIN_ID = '66666666-6666-4666-8666-666666666666';
const CATEGORY_ID = '77777777-7777-4777-8777-777777777777';

describe('ProductsService contract', () => {
  let service: ProductsService;
  let productRepo: ReturnType<typeof createRepositoryMock>;
  let imageRepo: ReturnType<typeof createRepositoryMock>;
  let certRepo: ReturnType<typeof createRepositoryMock>;
  let categoryRepo: ReturnType<typeof createRepositoryMock>;
  let wishlistRepo: ReturnType<typeof createRepositoryMock>;
  let notificationPublisher: { publish: jest.Mock };
  let dataSource: { transaction: jest.Mock; query: jest.Mock };

  beforeEach(() => {
    productRepo = createRepositoryMock();
    imageRepo = createRepositoryMock();
    certRepo = createRepositoryMock();
    categoryRepo = createRepositoryMock();
    wishlistRepo = createRepositoryMock();
    notificationPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    dataSource = {
      transaction: jest.fn(),
      query: jest.fn(),
    };

    service = new ProductsService(
      productRepo as never,
      imageRepo as never,
      certRepo as never,
      categoryRepo as never,
      wishlistRepo as never,
      notificationPublisher,
      dataSource as never,
    );
  });

  describe('public catalog query', () => {
    it('keeps public listing active-only even when a status filter is provided', async () => {
      const queryBuilder = createQueryBuilderMock<Product>([[], 0]);
      productRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findAll({
        page: 2,
        limit: 10,
        search: 'xoai',
        sellerId: OTHER_SELLER_ID,
        status: ProductStatus.DRAFT,
        sortBy: 'pricePerUnit',
        order: 'ASC',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('p.pricePerUnit', 'ASC');
      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.name ILIKE :search OR p.description ILIKE :search',
        { search: '%xoai%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.sellerId = :sellerId',
        { sellerId: OTHER_SELLER_ID },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.status = :status', {
        status: ProductStatus.ACTIVE,
      });
      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'p.status = :status',
        { status: ProductStatus.DRAFT },
      );
    });

    it('allows the current seller to filter their own products by non-active status', async () => {
      const queryBuilder = createQueryBuilderMock<Product>([[], 0]);
      productRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.findAll(
        {
          sellerId: SELLER_ID,
          status: ProductStatus.DRAFT,
        },
        SELLER_ID,
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'p.sellerId = :sellerId',
        { sellerId: SELLER_ID },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.status = :status', {
        status: ProductStatus.DRAFT,
      });
    });

    it('keeps wishlist listing active-only and paginated', async () => {
      const activeProduct = makeProduct({ id: PRODUCT_ID });
      const queryBuilder = createQueryBuilderMock<Wishlist>([
        [{ product: activeProduct } as Wishlist],
        1,
      ]);
      wishlistRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getWishlist(USER_ID, {
        page: 3,
        limit: 5,
      });

      expect(queryBuilder.where).toHaveBeenCalledWith('w.userId = :userId', {
        userId: USER_ID,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.status = :status', {
        status: ProductStatus.ACTIVE,
      });
      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        data: [activeProduct],
        total: 1,
        page: 3,
        limit: 5,
      });
    });
  });

  describe('seller product commands', () => {
    it('creates a draft product and normalizes image/certification defaults', async () => {
      const savedProduct = makeProduct({ status: ProductStatus.DRAFT });
      const manager = {
        create: jest.fn((_entity, value) => value),
        save: jest.fn(async (entity, value) => {
          if (entity === Product) return { ...value, id: PRODUCT_ID };
          return value;
        }),
        findOneOrFail: jest.fn().mockResolvedValue(savedProduct),
      };
      dataSource.transaction.mockImplementation(async (work) => work(manager));

      const result = await service.create(SELLER_ID, SellerType.FARMER, {
        name: 'Xoai cat Hoa Loc',
        pricePerUnit: 25000,
        unit: ProductUnit.KG,
        availableQuantity: 100,
        images: [{ imageUrl: 'https://example.test/product.jpg' }],
        certifications: [
          {
            certType: CertType.VIETGAP,
            certNumber: 'VG-001',
            issuedDate: '2026-06-01',
            expiryDate: '2027-06-01',
          },
        ],
      });

      expect(result).toBe(savedProduct);
      expect(manager.create).toHaveBeenCalledWith(
        Product,
        expect.objectContaining({
          sellerId: SELLER_ID,
          sellerType: SellerType.FARMER,
          status: ProductStatus.DRAFT,
        }),
      );
      expect(manager.save).toHaveBeenCalledWith(
        ProductImage,
        [
          expect.objectContaining({
            productId: PRODUCT_ID,
            imageUrl: 'https://example.test/product.jpg',
            isPrimary: true,
            sortOrder: 0,
          }),
        ],
      );
      expect(manager.save).toHaveBeenCalledWith(
        ProductCertification,
        [
          expect.objectContaining({
            productId: PRODUCT_ID,
            certType: CertType.VIETGAP,
            certNumber: 'VG-001',
            isVerified: false,
            status: CertificationStatus.PENDING,
          }),
        ],
      );
    });

    it('blocks non-owners from mutating seller-owned products', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct({ sellerId: SELLER_ID }));

      await expect(
        service.update(PRODUCT_ID, OTHER_SELLER_ID, { name: 'Ten moi' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('status flow', () => {
    it('lets a seller submit a draft product for approval and publishes a status notification', async () => {
      productRepo.findOne.mockResolvedValue(
        makeProduct({ sellerId: SELLER_ID, status: ProductStatus.DRAFT }),
      );
      productRepo.save.mockImplementation(async (product) => product);

      const result = await service.updateStatus(
        PRODUCT_ID,
        SELLER_ID,
        UserRole.FARMER,
        ProductStatus.PENDING_APPROVAL,
      );

      expect(result.status).toBe(ProductStatus.PENDING_APPROVAL);
      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProductStatus.PENDING_APPROVAL,
          rejectionReason: null,
        }),
      );
      expect(notificationPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: SELLER_ID,
          type: NotifType.PRODUCT_STATUS_CHANGED,
          data: expect.objectContaining({
            productId: PRODUCT_ID,
            previousStatus: ProductStatus.DRAFT,
            status: ProductStatus.PENDING_APPROVAL,
          }),
        }),
      );
    });

    it('lets an admin approve a pending product with stock and publishes product approved notification', async () => {
      productRepo.findOne.mockResolvedValue(
        makeProduct({
          sellerId: SELLER_ID,
          status: ProductStatus.PENDING_APPROVAL,
          availableQuantity: 10,
        }),
      );
      productRepo.save.mockImplementation(async (product) => product);

      const result = await service.updateStatus(
        PRODUCT_ID,
        ADMIN_ID,
        UserRole.ADMIN,
        ProductStatus.ACTIVE,
      );

      expect(result.status).toBe(ProductStatus.ACTIVE);
      expect(notificationPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: SELLER_ID,
          type: NotifType.PRODUCT_APPROVED,
        }),
      );
    });

    it('rejects invalid status transitions', async () => {
      productRepo.findOne.mockResolvedValue(
        makeProduct({
          sellerId: SELLER_ID,
          status: ProductStatus.ACTIVE,
        }),
      );

      await expect(
        service.updateStatus(
          PRODUCT_ID,
          SELLER_ID,
          UserRole.FARMER,
          ProductStatus.PENDING_APPROVAL,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(productRepo.save).not.toHaveBeenCalled();
      expect(notificationPublisher.publish).not.toHaveBeenCalled();
    });

    it('requires positive stock before approving an active product', async () => {
      productRepo.findOne.mockResolvedValue(
        makeProduct({
          sellerId: SELLER_ID,
          status: ProductStatus.PENDING_APPROVAL,
          availableQuantity: 0,
        }),
      );

      await expect(
        service.updateStatus(
          PRODUCT_ID,
          ADMIN_ID,
          UserRole.ADMIN,
          ProductStatus.ACTIVE,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('certification verification', () => {
    it('verifies a pending certification as admin/state-agency flow', async () => {
      const certification = makeCertification();
      certRepo.findOne.mockResolvedValue(certification);
      certRepo.save.mockImplementation(async (cert) => cert);

      const result = await service.verifyCertification(CERT_ID, ADMIN_ID, {
        status: CertificationStatus.VERIFIED,
      });

      expect(result).toMatchObject({
        id: CERT_ID,
        isVerified: true,
        status: CertificationStatus.VERIFIED,
        verifiedBy: ADMIN_ID,
        rejectionReason: null,
      });
      expect(result.verifiedAt).toBeInstanceOf(Date);
    });

    it('requires a rejection reason when rejecting certification', async () => {
      certRepo.findOne.mockResolvedValue(makeCertification());

      await expect(
        service.verifyCertification(CERT_ID, ADMIN_ID, {
          status: CertificationStatus.REJECTED,
          rejectionReason: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('wishlist commands', () => {
    it('requires an active product before adding to wishlist', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.addToWishlist(USER_ID, PRODUCT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(wishlistRepo.save).not.toHaveBeenCalled();
    });

    it('keeps add-to-wishlist idempotent', async () => {
      const existing = makeWishlist();
      productRepo.findOne.mockResolvedValue(
        makeProduct({ status: ProductStatus.ACTIVE }),
      );
      wishlistRepo.findOne.mockResolvedValue(existing);

      const result = await service.addToWishlist(USER_ID, PRODUCT_ID);

      expect(result).toBe(existing);
      expect(wishlistRepo.create).not.toHaveBeenCalled();
      expect(wishlistRepo.save).not.toHaveBeenCalled();
    });
  });
});

function createRepositoryMock() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    update: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    query: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

function createQueryBuilderMock<TEntity>(
  itemsAndTotal: [TEntity[], number] = [[], 0],
) {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn(),
    innerJoinAndSelect: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    andWhere: jest.fn(),
    where: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue(itemsAndTotal),
  };

  Object.values(queryBuilder).forEach((method) => {
    if (jest.isMockFunction(method) && method !== queryBuilder.getManyAndCount) {
      method.mockReturnValue(queryBuilder);
    }
  });

  return queryBuilder;
}

function makeCategory(overrides: Partial<ProductCategory> = {}): ProductCategory {
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
  } as ProductCategory;
}

function makeProduct(overrides: Partial<Product> = {}): Product {
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
  } as Product;
}

function makeCertification(
  overrides: Partial<ProductCertification> = {},
): ProductCertification {
  return {
    id: CERT_ID,
    productId: PRODUCT_ID,
    certType: CertType.VIETGAP,
    certNumber: 'VG-001',
    issuedBy: 'Co quan chung nhan',
    issuedDate: null,
    expiryDate: null,
    documentUrl: 'https://example.test/cert.pdf',
    isVerified: false,
    status: CertificationStatus.PENDING,
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    product: makeProduct(),
    ...overrides,
  } as ProductCertification;
}

function makeWishlist(overrides: Partial<Wishlist> = {}): Wishlist {
  return {
    id: '88888888-8888-4888-8888-888888888888',
    userId: USER_ID,
    productId: PRODUCT_ID,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    product: makeProduct(),
    ...overrides,
  } as Wishlist;
}
