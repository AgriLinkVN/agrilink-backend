import {
  CertificationStatus,
  NotifType,
  ProductStatus,
  ProductUnit,
  SellerType,
  UserRole,
} from '@common/enums';
import {
  ProductCertificationModel,
  ProductModel,
  WishlistModel,
} from './models/product.model';
import {
  InvalidProductCertificationFileError,
  InvalidProductCertificationVerificationError,
  ProductCertificationConsistencyError,
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
  AddProductCertificationUseCase,
  AddWishlistItemUseCase,
  ChangeProductStatusUseCase,
  CreateProductUseCase,
  GetProductDetailUseCase,
  RemoveProductCertificationUseCase,
  UpdateProductUseCase,
  VerifyProductCertificationUseCase,
} from './use-cases/product.use-cases';
import { StoredFileAccessPort } from '@modules/storage/application/ports/inbound/stored-file-access.port';
import { StoredFileNotFoundError } from '@modules/storage/application/storage-file.errors';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const CERT_ID = '22222222-2222-4222-8222-222222222222';
const SELLER_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_SELLER_ID = '44444444-4444-4444-8444-444444444444';
const USER_ID = '55555555-5555-4555-8555-555555555555';
const ADMIN_ID = '66666666-6666-4666-8666-666666666666';

function makeProduct(overrides: Partial<ProductModel> = {}): ProductModel {
  return {
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
  } as ProductModel;
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

function makeStoredFileAccess(): jest.Mocked<StoredFileAccessPort> {
  return {
    attachOwnedFile: jest.fn(),
    detachOwnedFile: jest.fn(),
    readOwnedFile: jest.fn(),
    reviewFile: jest.fn().mockResolvedValue(true),
    restoreReviewedFile: jest.fn(),
    retireOwnedFile: jest.fn(),
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
      useCase.execute(
        PRODUCT_ID,
        SELLER_ID,
        UserRole.FARMER,
        ProductStatus.ACTIVE,
      ),
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
    repository.findByIdWithProduct.mockResolvedValue({
      id: CERT_ID,
    } as ProductCertificationModel);
    const useCase = new VerifyProductCertificationUseCase(
      repository,
      makeStoredFileAccess(),
    );

    await expect(
      useCase.execute(CERT_ID, ADMIN_ID, UserRole.ADMIN, {
        status: CertificationStatus.REJECTED,
      }),
    ).rejects.toThrow(InvalidProductCertificationVerificationError);
    expect(repository.saveCertification).not.toHaveBeenCalled();
  });

  it('updates the private file after certification persistence succeeds', async () => {
    const repository = makeCertificationRepository();
    const storedFileAccess = makeStoredFileAccess();
    const certification = {
      id: CERT_ID,
      storedFileId: CERT_ID,
      status: CertificationStatus.PENDING,
      isVerified: false,
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
    } as ProductCertificationModel;
    repository.findByIdWithProduct.mockResolvedValue(certification);
    repository.saveCertification.mockImplementation(async (saved) => saved);
    const useCase = new VerifyProductCertificationUseCase(
      repository,
      storedFileAccess,
    );

    await useCase.execute(CERT_ID, ADMIN_ID, UserRole.STATE_AGENCY, {
      status: CertificationStatus.VERIFIED,
    });

    expect(storedFileAccess.reviewFile).toHaveBeenCalledWith({
      fileId: CERT_ID,
      reviewerRole: UserRole.STATE_AGENCY,
      approve: true,
    });
    expect(
      repository.saveCertification.mock.invocationCallOrder[0],
    ).toBeLessThan(storedFileAccess.reviewFile.mock.invocationCallOrder[0]);
  });

  it('attaches an owned private file before creating a certification', async () => {
    const productRepository = makeProductRepository();
    const certificationRepository = makeCertificationRepository();
    const storedFileAccess = makeStoredFileAccess();
    productRepository.findByIdWithRelations.mockResolvedValue(makeProduct());
    certificationRepository.addCertification.mockResolvedValue({
      id: CERT_ID,
      storedFileId: CERT_ID,
    } as ProductCertificationModel);
    const useCase = new AddProductCertificationUseCase(
      productRepository,
      certificationRepository,
      storedFileAccess,
    );

    await useCase.execute(PRODUCT_ID, SELLER_ID, {
      certType: 'vietgap' as never,
      storedFileId: CERT_ID,
    });

    expect(storedFileAccess.attachOwnedFile).toHaveBeenCalledWith({
      fileId: CERT_ID,
      ownerId: SELLER_ID,
      assetType: 'CERTIFICATION',
      resourceType: 'PRODUCT',
      resourceId: PRODUCT_ID,
    });
    expect(certificationRepository.addCertification).toHaveBeenCalled();
  });

  it('does not create a certification when the private file is unauthorized', async () => {
    const productRepository = makeProductRepository();
    const certificationRepository = makeCertificationRepository();
    const storedFileAccess = makeStoredFileAccess();
    productRepository.findByIdWithRelations.mockResolvedValue(makeProduct());
    storedFileAccess.attachOwnedFile.mockRejectedValue(
      new StoredFileNotFoundError('Stored file not found'),
    );
    const useCase = new AddProductCertificationUseCase(
      productRepository,
      certificationRepository,
      storedFileAccess,
    );

    await expect(
      useCase.execute(PRODUCT_ID, SELLER_ID, {
        certType: 'vietgap' as never,
        storedFileId: CERT_ID,
      }),
    ).rejects.toThrow(InvalidProductCertificationFileError);
    expect(certificationRepository.addCertification).not.toHaveBeenCalled();
  });

  it('detaches a certification file when certification persistence fails', async () => {
    const productRepository = makeProductRepository();
    const certificationRepository = makeCertificationRepository();
    const storedFileAccess = makeStoredFileAccess();
    productRepository.findByIdWithRelations.mockResolvedValue(makeProduct());
    certificationRepository.addCertification.mockRejectedValue(
      new Error('database unavailable'),
    );
    const useCase = new AddProductCertificationUseCase(
      productRepository,
      certificationRepository,
      storedFileAccess,
    );

    await expect(
      useCase.execute(PRODUCT_ID, SELLER_ID, {
        certType: 'vietgap' as never,
        storedFileId: CERT_ID,
      }),
    ).rejects.toThrow('database unavailable');
    expect(storedFileAccess.detachOwnedFile).toHaveBeenCalledWith({
      fileId: CERT_ID,
      ownerId: SELLER_ID,
      resourceType: 'PRODUCT',
      resourceId: PRODUCT_ID,
    });
  });

  it('surfaces a consistency error when certification compensation fails', async () => {
    const productRepository = makeProductRepository();
    const certificationRepository = makeCertificationRepository();
    const storedFileAccess = makeStoredFileAccess();
    productRepository.findByIdWithRelations.mockResolvedValue(makeProduct());
    certificationRepository.addCertification.mockRejectedValue(
      new Error('database unavailable'),
    );
    storedFileAccess.detachOwnedFile.mockRejectedValue(
      new Error('detach unavailable'),
    );
    const useCase = new AddProductCertificationUseCase(
      productRepository,
      certificationRepository,
      storedFileAccess,
    );

    await expect(
      useCase.execute(PRODUCT_ID, SELLER_ID, {
        certType: 'vietgap' as never,
        storedFileId: CERT_ID,
      }),
    ).rejects.toThrow(ProductCertificationConsistencyError);
  });

  it('rethrows infrastructure attachment failures without mapping them to bad input', async () => {
    const productRepository = makeProductRepository();
    const certificationRepository = makeCertificationRepository();
    const storedFileAccess = makeStoredFileAccess();
    productRepository.findByIdWithRelations.mockResolvedValue(makeProduct());
    storedFileAccess.attachOwnedFile.mockRejectedValue(
      new Error('database unavailable'),
    );
    const useCase = new AddProductCertificationUseCase(
      productRepository,
      certificationRepository,
      storedFileAccess,
    );

    await expect(
      useCase.execute(PRODUCT_ID, SELLER_ID, {
        certType: 'vietgap' as never,
        storedFileId: CERT_ID,
      }),
    ).rejects.toThrow('database unavailable');
    expect(certificationRepository.addCertification).not.toHaveBeenCalled();
  });

  it('restores certification state when the file review transition fails', async () => {
    const repository = makeCertificationRepository();
    const storedFileAccess = makeStoredFileAccess();
    const certification = {
      id: CERT_ID,
      productId: PRODUCT_ID,
      storedFileId: CERT_ID,
      status: CertificationStatus.PENDING,
      isVerified: false,
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
    } as ProductCertificationModel;
    repository.findByIdWithProduct.mockResolvedValue(certification);
    repository.saveCertification.mockImplementation(async (saved) => ({
      ...saved,
    }));
    storedFileAccess.reviewFile.mockRejectedValue(
      new Error('storage unavailable'),
    );
    const useCase = new VerifyProductCertificationUseCase(
      repository,
      storedFileAccess,
    );

    await expect(
      useCase.execute(CERT_ID, ADMIN_ID, UserRole.ADMIN, {
        status: CertificationStatus.VERIFIED,
      }),
    ).rejects.toThrow('storage unavailable');

    expect(repository.saveCertification).toHaveBeenCalledTimes(2);
    expect(repository.saveCertification).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: CertificationStatus.PENDING,
        isVerified: false,
        verifiedBy: null,
        verifiedAt: null,
      }),
    );
  });

  it('retires the private file after a certification is removed', async () => {
    const productRepository = makeProductRepository();
    const certificationRepository = makeCertificationRepository();
    const storedFileAccess = makeStoredFileAccess();
    productRepository.findByIdWithRelations.mockResolvedValue(makeProduct());
    certificationRepository.findByIdWithProduct.mockResolvedValue({
      id: CERT_ID,
      productId: PRODUCT_ID,
      storedFileId: CERT_ID,
    } as ProductCertificationModel);
    certificationRepository.removeCertificationByProduct.mockResolvedValue(
      true,
    );
    const useCase = new RemoveProductCertificationUseCase(
      productRepository,
      certificationRepository,
      storedFileAccess,
    );

    await useCase.execute(PRODUCT_ID, CERT_ID, SELLER_ID);

    expect(storedFileAccess.retireOwnedFile).toHaveBeenCalledWith({
      fileId: CERT_ID,
      ownerId: SELLER_ID,
      correlationId: expect.any(String),
    });
  });

  it('delegates duplicate-safe wishlist persistence to the atomic repository operation', async () => {
    const productRepository = makeProductRepository();
    const wishlistRepository = makeWishlistRepository();
    const existing: WishlistModel = {
      id: '77777777-7777-4777-8777-777777777777',
      userId: USER_ID,
      productId: PRODUCT_ID,
      createdAt: new Date(),
    };
    productRepository.findActiveById.mockResolvedValue(
      makeProduct({ status: ProductStatus.ACTIVE }),
    );
    wishlistRepository.addIfAbsent.mockResolvedValue(existing);
    const useCase = new AddWishlistItemUseCase(
      productRepository,
      wishlistRepository,
    );

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
    const useCase = new AddWishlistItemUseCase(
      productRepository,
      wishlistRepository,
    );

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
    const useCase = new GetProductDetailUseCase({
      findOne: jest.fn().mockResolvedValue(null),
    });

    await expect(useCase.execute(PRODUCT_ID)).rejects.toThrow(
      ProductNotFoundError,
    );
  });

  it('derives seller type from the authenticated seller role when JWT has no sellerType', async () => {
    const repository = makeProductRepository();
    repository.createAtomically.mockResolvedValue(makeProduct());
    const useCase = new CreateProductUseCase(repository);

    await useCase.execute(SELLER_ID, undefined, UserRole.COOPERATIVE, {
      name: 'Xoai cat Hoa Loc',
      pricePerUnit: 25000,
      unit: ProductUnit.KG,
      availableQuantity: 10,
    });

    expect(repository.createAtomically).toHaveBeenCalledWith(
      SELLER_ID,
      SellerType.COOPERATIVE,
      expect.any(Object),
    );
  });
});
