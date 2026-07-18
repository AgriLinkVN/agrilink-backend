import {
  CertificationStatus,
  NotifType,
  ProductStatus,
  ProductUnit,
  SellerType,
  UserRole,
} from '@common/enums';
import { Product } from '../domain/entities/product.entity';
import { ProductCertification } from '../domain/entities/product-certification.entity';
import { Wishlist } from '../domain/entities/wishlist.entity';
import {
  InvalidProductCertificationVerificationError,
  ProductForbiddenError,
  ProductNotFoundError,
  WishlistProductUnavailableError,
} from '../domain/errors/product-application.error';
import {
  ProductCertificationRepositoryPort,
  ProductRepositoryPort,
  ProductWishlistRepositoryPort,
} from './ports/outbound/product-repository.port';
import {
  AddWishlistItemUseCase,
  ChangeProductStatusUseCase,
  CreateProductUseCase,
  GetProductDetailUseCase,
  UpdateProductUseCase,
  VerifyProductCertificationUseCase,
} from './use-cases/product.use-cases';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const CERT_ID = '22222222-2222-4222-8222-222222222222';
const SELLER_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_SELLER_ID = '44444444-4444-4444-8444-444444444444';
const USER_ID = '55555555-5555-4555-8555-555555555555';
const ADMIN_ID = '66666666-6666-4666-8666-666666666666';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return Object.assign(new Product(), {
    id: PRODUCT_ID,
    sellerId: SELLER_ID,
    sellerType: SellerType.FARMER,
    name: 'Xoai cat Hoa Loc',
    pricePerUnit: 25000,
    unit: ProductUnit.KG,
    availableQuantity: 10,
    status: ProductStatus.DRAFT,
    rejectionReason: null,
    ...overrides,
  });
}

function makeProductRepository(): jest.Mocked<ProductRepositoryPort> {
  return {
    createAtomically: jest.fn(),
    findByIdWithRelations: jest.fn(),
    findActiveById: jest.fn(),
    save: jest.fn(),
  };
}

function makeCertificationRepository(): jest.Mocked<ProductCertificationRepositoryPort> {
  return {
    addCertification: jest.fn(),
    findPending: jest.fn(),
    findByIdWithProduct: jest.fn(),
    saveCertification: jest.fn(),
    removeCertificationByProduct: jest.fn(),
  };
}

function makeWishlistRepository(): jest.Mocked<ProductWishlistRepositoryPort> {
  return {
    findByUserAndProduct: jest.fn(),
    addIfAbsent: jest.fn(),
    remove: jest.fn(),
    getWishlist: jest.fn(),
    getWishlistedIds: jest.fn(),
  };
}

describe('Product application use cases', () => {
  it('blocks non-owners from updating a product', async () => {
    const repository = makeProductRepository();
    repository.findByIdWithRelations.mockResolvedValue(makeProduct());
    const useCase = new UpdateProductUseCase(repository);

    await expect(
      useCase.execute(PRODUCT_ID, OTHER_SELLER_ID, { name: 'Ten moi' }),
    ).rejects.toThrow(ProductForbiddenError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('persists a status transition before publishing its notification', async () => {
    const repository = makeProductRepository();
    const publisher = { publish: jest.fn().mockResolvedValue(undefined) };
    const product = makeProduct({ status: ProductStatus.DRAFT });
    repository.findByIdWithRelations.mockResolvedValue(product);
    repository.save.mockImplementation(async (saved) => saved);
    const useCase = new ChangeProductStatusUseCase(repository, publisher);

    await expect(
      useCase.execute(
        PRODUCT_ID,
        SELLER_ID,
        UserRole.FARMER,
        ProductStatus.PENDING_APPROVAL,
      ),
    ).resolves.toMatchObject({ status: ProductStatus.PENDING_APPROVAL });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ProductStatus.PENDING_APPROVAL,
        rejectionReason: null,
      }),
    );
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: SELLER_ID,
        type: NotifType.PRODUCT_STATUS_CHANGED,
      }),
    );
    expect(repository.save.mock.invocationCallOrder[0]).toBeLessThan(
      publisher.publish.mock.invocationCallOrder[0],
    );
  });

  it('does not allow a seller to approve their own pending product', async () => {
    const repository = makeProductRepository();
    repository.findByIdWithRelations.mockResolvedValue(
      makeProduct({ status: ProductStatus.PENDING_APPROVAL }),
    );
    const useCase = new ChangeProductStatusUseCase(repository, {
      publish: jest.fn(),
    });

    await expect(
      useCase.execute(PRODUCT_ID, SELLER_ID, UserRole.FARMER, ProductStatus.ACTIVE),
    ).rejects.toThrow(ProductForbiddenError);
  });

  it('checks authorization before accepting a no-op status request', async () => {
    const repository = makeProductRepository();
    repository.findByIdWithRelations.mockResolvedValue(makeProduct());
    const useCase = new ChangeProductStatusUseCase(repository, {
      publish: jest.fn(),
    });

    await expect(
      useCase.execute(
        PRODUCT_ID,
        OTHER_SELLER_ID,
        UserRole.BUYER,
        ProductStatus.DRAFT,
      ),
    ).rejects.toThrow(ProductForbiddenError);
  });

  it('requires a rejection reason when rejecting a certification', async () => {
    const repository = makeCertificationRepository();
    repository.findByIdWithProduct.mockResolvedValue(
      Object.assign(new ProductCertification(), { id: CERT_ID }),
    );
    const useCase = new VerifyProductCertificationUseCase(repository);

    await expect(
      useCase.execute(CERT_ID, ADMIN_ID, { status: CertificationStatus.REJECTED }),
    ).rejects.toThrow(InvalidProductCertificationVerificationError);
    expect(repository.saveCertification).not.toHaveBeenCalled();
  });

  it('delegates duplicate-safe wishlist persistence to the atomic repository operation', async () => {
    const productRepository = makeProductRepository();
    const wishlistRepository = makeWishlistRepository();
    const existing = Object.assign(new Wishlist(), {
      id: '77777777-7777-4777-8777-777777777777',
      userId: USER_ID,
      productId: PRODUCT_ID,
    });
    productRepository.findActiveById.mockResolvedValue(makeProduct({ status: ProductStatus.ACTIVE }));
    wishlistRepository.addIfAbsent.mockResolvedValue(existing);
    const useCase = new AddWishlistItemUseCase(productRepository, wishlistRepository);

    await expect(useCase.execute(USER_ID, PRODUCT_ID)).resolves.toBe(existing);
    expect(wishlistRepository.addIfAbsent).toHaveBeenCalledWith(
      USER_ID,
      PRODUCT_ID,
    );
  });

  it('rejects a wishlist item when the product is not active', async () => {
    const productRepository = makeProductRepository();
    const wishlistRepository = makeWishlistRepository();
    productRepository.findActiveById.mockResolvedValue(null);
    const useCase = new AddWishlistItemUseCase(productRepository, wishlistRepository);

    await expect(useCase.execute(USER_ID, PRODUCT_ID)).rejects.toThrow(
      WishlistProductUnavailableError,
    );
    expect(wishlistRepository.addIfAbsent).not.toHaveBeenCalled();
  });

  it('does not publish a status notification when persistence fails', async () => {
    const repository = makeProductRepository();
    const publisher = { publish: jest.fn() };
    repository.findByIdWithRelations.mockResolvedValue(makeProduct());
    repository.save.mockRejectedValue(new Error('database unavailable'));
    const useCase = new ChangeProductStatusUseCase(repository, publisher);

    await expect(
      useCase.execute(
        PRODUCT_ID,
        SELLER_ID,
        UserRole.FARMER,
        ProductStatus.PENDING_APPROVAL,
      ),
    ).rejects.toThrow('database unavailable');
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('maps a missing public detail projection to not found', async () => {
    const useCase = new GetProductDetailUseCase({ findOne: jest.fn().mockResolvedValue(null) });

    await expect(useCase.execute(PRODUCT_ID)).rejects.toThrow(ProductNotFoundError);
  });

  it('derives seller type from the authenticated seller role when JWT has no sellerType', async () => {
    const repository = makeProductRepository();
    repository.createAtomically.mockResolvedValue(makeProduct());
    const useCase = new CreateProductUseCase(repository);

    await useCase.execute(
      SELLER_ID,
      undefined,
      UserRole.COOPERATIVE,
      {
        name: 'Xoai cat Hoa Loc',
        pricePerUnit: 25000,
        unit: ProductUnit.KG,
        availableQuantity: 10,
      },
    );

    expect(repository.createAtomically).toHaveBeenCalledWith(
      SELLER_ID,
      SellerType.COOPERATIVE,
      expect.any(Object),
    );
  });
});
