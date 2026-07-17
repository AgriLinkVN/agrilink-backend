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
  let productRepository: ReturnType<typeof createProductRepositoryMock>;
  let productCatalogQuery: ReturnType<typeof createProductCatalogQueryMock>;
  let productDetailQuery: ReturnType<typeof createProductDetailQueryMock>;
  let productCategoryQuery: ReturnType<typeof createProductCategoryQueryMock>;
  let productImageRepository: ReturnType<typeof createProductImageRepositoryMock>;
  let productCertificationRepository: ReturnType<
    typeof createProductCertificationRepositoryMock
  >;
  let productWishlistRepository: ReturnType<
    typeof createProductWishlistRepositoryMock
  >;
  let productSeedRepository: ReturnType<typeof createProductSeedRepositoryMock>;
  let notificationPublisher: { publish: jest.Mock };

  beforeEach(() => {
    productRepository = createProductRepositoryMock();
    productCatalogQuery = createProductCatalogQueryMock();
    productDetailQuery = createProductDetailQueryMock();
    productCategoryQuery = createProductCategoryQueryMock();
    productImageRepository = createProductImageRepositoryMock();
    productCertificationRepository = createProductCertificationRepositoryMock();
    productWishlistRepository = createProductWishlistRepositoryMock();
    productSeedRepository = createProductSeedRepositoryMock();
    notificationPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    service = new ProductsService(
      productRepository as never,
      productCatalogQuery as never,
      productDetailQuery as never,
      productCategoryQuery as never,
      productImageRepository as never,
      productCertificationRepository as never,
      productWishlistRepository as never,
      productSeedRepository as never,
      notificationPublisher,
    );
  });

  describe('queries', () => {
    it('delegates public catalog query with current user context', async () => {
      productCatalogQuery.findAll.mockResolvedValue({ data: [], total: 0 });

      await service.findAll(
        {
          search: 'xoai',
          sellerId: SELLER_ID,
          status: ProductStatus.DRAFT,
          sortBy: 'pricePerUnit',
          order: 'ASC',
        },
        SELLER_ID,
      );

      expect(productCatalogQuery.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'xoai',
          sellerId: SELLER_ID,
          status: ProductStatus.DRAFT,
          sortBy: 'pricePerUnit',
          order: 'ASC',
        }),
        SELLER_ID,
      );
    });

    it('delegates product detail lookup and maps missing product to NotFoundException', async () => {
      productDetailQuery.findOne.mockResolvedValue(null);

      await expect(service.findOne(PRODUCT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('delegates wishlist listing to the wishlist port', async () => {
      const result = {
        data: [makeProduct()],
        total: 1,
        page: 3,
        limit: 5,
      };
      productWishlistRepository.getWishlist.mockResolvedValue(result);

      await expect(
        service.getWishlist(USER_ID, { page: 3, limit: 5 }),
      ).resolves.toBe(result);
      expect(productWishlistRepository.getWishlist).toHaveBeenCalledWith(
        USER_ID,
        { page: 3, limit: 5 },
      );
    });
  });

  describe('seller product commands', () => {
    it('creates a draft product through the repository port', async () => {
      const savedProduct = makeProduct({ status: ProductStatus.DRAFT });
      productRepository.create.mockResolvedValue(savedProduct);

      const input = {
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
      };

      const result = await service.create(
        SELLER_ID,
        SellerType.FARMER,
        input,
      );

      expect(result).toBe(savedProduct);
      expect(productRepository.create).toHaveBeenCalledWith(
        SELLER_ID,
        SellerType.FARMER,
        input,
      );
    });

    it('blocks non-owners from mutating seller-owned products', async () => {
      productRepository.findByIdWithRelations.mockResolvedValue(
        makeProduct({ sellerId: SELLER_ID }),
      );

      await expect(
        service.update(PRODUCT_ID, OTHER_SELLER_ID, { name: 'Ten moi' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('status flow', () => {
    it('lets a seller submit a draft product for approval and publishes a status notification', async () => {
      productRepository.findByIdWithRelations.mockResolvedValue(
        makeProduct({ sellerId: SELLER_ID, status: ProductStatus.DRAFT }),
      );
      productRepository.save.mockImplementation(async (product) => product);

      const result = await service.updateStatus(
        PRODUCT_ID,
        SELLER_ID,
        UserRole.FARMER,
        ProductStatus.PENDING_APPROVAL,
      );

      expect(result.status).toBe(ProductStatus.PENDING_APPROVAL);
      expect(productRepository.save).toHaveBeenCalledWith(
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
      productRepository.findByIdWithRelations.mockResolvedValue(
        makeProduct({
          sellerId: SELLER_ID,
          status: ProductStatus.PENDING_APPROVAL,
          availableQuantity: 10,
        }),
      );
      productRepository.save.mockImplementation(async (product) => product);

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
      productRepository.findByIdWithRelations.mockResolvedValue(
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
      expect(productRepository.save).not.toHaveBeenCalled();
      expect(notificationPublisher.publish).not.toHaveBeenCalled();
    });

    it('requires positive stock before approving an active product', async () => {
      productRepository.findByIdWithRelations.mockResolvedValue(
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
      productCertificationRepository.findByIdWithProduct.mockResolvedValue(
        certification,
      );
      productCertificationRepository.saveCertification.mockImplementation(
        async (cert) => cert,
      );

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
      productCertificationRepository.findByIdWithProduct.mockResolvedValue(
        makeCertification(),
      );

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
      productRepository.findActiveById.mockResolvedValue(null);

      await expect(service.addToWishlist(USER_ID, PRODUCT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(productWishlistRepository.addWishlist).not.toHaveBeenCalled();
    });

    it('keeps add-to-wishlist idempotent', async () => {
      const existing = makeWishlist();
      productRepository.findActiveById.mockResolvedValue(
        makeProduct({ status: ProductStatus.ACTIVE }),
      );
      productWishlistRepository.findByUserAndProduct.mockResolvedValue(existing);

      const result = await service.addToWishlist(USER_ID, PRODUCT_ID);

      expect(result).toBe(existing);
      expect(productWishlistRepository.addWishlist).not.toHaveBeenCalled();
    });
  });
});

function createProductRepositoryMock() {
  return {
    create: jest.fn(),
    findByIdWithRelations: jest.fn(),
    findActiveById: jest.fn(),
    save: jest.fn(),
  };
}

function createProductCatalogQueryMock() {
  return {
    findAll: jest.fn(),
    findMine: jest.fn(),
  };
}

function createProductDetailQueryMock() {
  return {
    findOne: jest.fn(),
  };
}

function createProductCategoryQueryMock() {
  return {
    findRootCategories: jest.fn(),
    getCategoryTree: jest.fn(),
    findAllCategories: jest.fn(),
  };
}

function createProductImageRepositoryMock() {
  return {
    addImage: jest.fn(),
    removeImageByProduct: jest.fn(),
  };
}

function createProductCertificationRepositoryMock() {
  return {
    addCertification: jest.fn(),
    findPending: jest.fn(),
    findByIdWithProduct: jest.fn(),
    saveCertification: jest.fn(),
    removeCertificationByProduct: jest.fn(),
  };
}

function createProductWishlistRepositoryMock() {
  return {
    findByUserAndProduct: jest.fn(),
    addWishlist: jest.fn(),
    remove: jest.fn(),
    getWishlist: jest.fn(),
    getWishlistedIds: jest.fn(),
  };
}

function createProductSeedRepositoryMock() {
  return {
    seedCategories: jest.fn(),
    countProducts: jest.fn(),
    resetProducts: jest.fn(),
    saveSeedProducts: jest.fn(),
    savePrimaryImagesForProducts: jest.fn(),
  };
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
