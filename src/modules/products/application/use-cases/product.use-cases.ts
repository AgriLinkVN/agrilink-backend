import { Inject, Injectable } from '@nestjs/common';

import {
  CertificationStatus,
  NotifType,
  ProductStatus,
  SellerType,
  UserRole,
} from '@common/enums';
import {
  NOTIFICATION_PUBLISHER,
  NotificationPublisherPort,
} from '@modules/notifications/application/ports/inbound/notification-publisher.port';
import {
  InvalidProductCertificationFileError,
  ProductCertificationNotFoundError,
  ProductForbiddenError,
  ProductNotFoundError,
} from '../../domain/errors/product-application.error';
import { assertValidCertificationVerification } from '../../domain/policies/product-certification-verification.policy';
import {
  STORED_FILE_ACCESS,
  StoredFileAccessPort,
} from '@modules/storage/application/ports/inbound/stored-file-access.port';
import { assertProductStatusTransition } from '../../domain/policies/product-status-transition.policy';
import { resolveSellerType } from '../../domain/policies/seller-type.policy';
import { assertWishlistProductIsAvailable } from '../../domain/policies/wishlist.policy';
import { ProductDetailResponse } from '../models/product-detail.model';
import {
  ProductCategoryModel,
  ProductCertificationModel,
  ProductImageModel,
  ProductModel,
  WishlistModel,
} from '../models/product.model';
import {
  CreateProductCertificationInput,
  CreateProductInput,
  ProductFilterInput,
  UpdateProductInput,
  VerifyProductCertificationInput,
  WishlistQueryInput,
} from '../models/product-input.model';
import {
  PRODUCT_CATALOG_QUERY,
  PRODUCT_CATEGORY_QUERY,
  PRODUCT_CERTIFICATION_REPOSITORY,
  PRODUCT_DETAIL_QUERY,
  PRODUCT_IMAGE_REPOSITORY,
  PRODUCT_REPOSITORY,
  PRODUCT_WISHLIST_REPOSITORY,
  ProductCatalogQueryPort,
  ProductCategoryQueryPort,
  ProductCertificationRepositoryPort,
  ProductDetailQueryPort,
  ProductImageRepositoryPort,
  ProductRepositoryPort,
  ProductWishlistRepositoryPort,
} from '../ports/outbound/product-repository.port';

async function findProductOrFail(
  productRepository: ProductRepositoryPort,
  productId: string,
): Promise<ProductModel> {
  const product = await productRepository.findByIdWithRelations(productId);
  if (!product) {
    throw new ProductNotFoundError('Không tìm thấy sản phẩm');
  }
  return product;
}

function assertProductOwner(
  product: ProductModel,
  sellerId: string,
  action: string,
): void {
  if (product.sellerId !== sellerId) {
    throw new ProductForbiddenError(
      `Bạn không có quyền ${action} sản phẩm này`,
    );
  }
}

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  execute(
    sellerId: string,
    sellerType: SellerType | undefined,
    role: UserRole,
    input: CreateProductInput,
  ): Promise<ProductModel> {
    return this.productRepository.createAtomically(
      sellerId,
      sellerType ?? resolveSellerType(role),
      input,
    );
  }
}

@Injectable()
export class ListPublicProductsUseCase {
  constructor(
    @Inject(PRODUCT_CATALOG_QUERY)
    private readonly productCatalogQuery: ProductCatalogQueryPort,
  ) {}

  execute(
    filter: ProductFilterInput,
    currentUserId?: string,
  ): Promise<{ data: ProductModel[]; total: number }> {
    return this.productCatalogQuery.findAll(filter, currentUserId);
  }
}

@Injectable()
export class GetProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_DETAIL_QUERY)
    private readonly productDetailQuery: ProductDetailQueryPort,
  ) {}

  async execute(id: string): Promise<ProductDetailResponse> {
    const product = await this.productDetailQuery.findOne(id);
    if (!product) {
      throw new ProductNotFoundError('Không tìm thấy sản phẩm');
    }
    return product;
  }
}

@Injectable()
export class ListSellerProductsUseCase {
  constructor(
    @Inject(PRODUCT_CATALOG_QUERY)
    private readonly productCatalogQuery: ProductCatalogQueryPort,
  ) {}

  execute(
    sellerId: string,
    filter: ProductFilterInput,
  ): Promise<{ data: ProductModel[]; total: number }> {
    return this.productCatalogQuery.findMine(sellerId, filter);
  }
}

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(
    id: string,
    sellerId: string,
    input: UpdateProductInput,
  ): Promise<ProductModel> {
    const product = await findProductOrFail(this.productRepository, id);
    assertProductOwner(product, sellerId, 'chỉnh sửa');
    Object.assign(product, input);
    return this.productRepository.save(product);
  }
}

@Injectable()
export class DeleteProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  async execute(id: string, sellerId: string): Promise<void> {
    const product = await findProductOrFail(this.productRepository, id);
    assertProductOwner(product, sellerId, 'xóa');
    product.status = ProductStatus.DRAFT;
    await this.productRepository.save(product);
  }
}

@Injectable()
export class ChangeProductStatusUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(NOTIFICATION_PUBLISHER)
    private readonly notificationPublisher: NotificationPublisherPort,
  ) {}

  async execute(
    id: string,
    actorId: string,
    actorRole: UserRole,
    nextStatus: ProductStatus,
  ): Promise<ProductModel> {
    const product = await findProductOrFail(this.productRepository, id);
    const previousStatus = product.status;
    assertProductStatusTransition({
      currentStatus: previousStatus,
      nextStatus,
      sellerId: product.sellerId,
      actorId,
      actorRole,
      availableQuantity: Number(product.availableQuantity),
    });
    if (previousStatus === nextStatus) {
      return product;
    }

    product.status = nextStatus;
    product.rejectionReason = null;
    const saved = await this.productRepository.save(product);
    await this.publishStatusChanged(saved, previousStatus);
    return saved;
  }

  private async publishStatusChanged(
    product: ProductModel,
    previousStatus: ProductStatus,
  ): Promise<void> {
    const titleByStatus: Record<ProductStatus, string> = {
      [ProductStatus.DRAFT]: 'Sản phẩm đã lưu nháp',
      [ProductStatus.PENDING_APPROVAL]: 'Sản phẩm đang chờ duyệt',
      [ProductStatus.ACTIVE]: 'Sản phẩm đã được duyệt',
      [ProductStatus.OUT_OF_STOCK]: 'Sản phẩm đã hết hàng',
      [ProductStatus.REJECTED]: 'Sản phẩm bị từ chối',
      [ProductStatus.ARCHIVED]: 'Sản phẩm đã lưu trữ',
      [ProductStatus.SUSPENDED]: 'Sản phẩm đã bị tạm khóa',
    };
    await this.notificationPublisher.publish({
      userId: product.sellerId,
      type:
        product.status === ProductStatus.ACTIVE
          ? NotifType.PRODUCT_APPROVED
          : NotifType.PRODUCT_STATUS_CHANGED,
      title: titleByStatus[product.status],
      body: `Sản phẩm "${product.name}" đã chuyển từ ${previousStatus} sang ${product.status}.`,
      data: { productId: product.id, previousStatus, status: product.status },
    });
  }
}

@Injectable()
export class AddProductImageUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(PRODUCT_IMAGE_REPOSITORY)
    private readonly productImageRepository: ProductImageRepositoryPort,
  ) {}

  async execute(
    productId: string,
    sellerId: string,
    imageUrl: string,
    isPrimary: boolean,
  ): Promise<ProductImageModel> {
    const product = await findProductOrFail(this.productRepository, productId);
    assertProductOwner(product, sellerId, 'thêm ảnh cho');
    return this.productImageRepository.addImage(productId, imageUrl, isPrimary);
  }
}

@Injectable()
export class RemoveProductImageUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(PRODUCT_IMAGE_REPOSITORY)
    private readonly productImageRepository: ProductImageRepositoryPort,
  ) {}

  async execute(
    productId: string,
    imageId: string,
    sellerId: string,
  ): Promise<void> {
    const product = await findProductOrFail(this.productRepository, productId);
    assertProductOwner(product, sellerId, 'xóa ảnh của');
    const removed = await this.productImageRepository.removeImageByProduct(
      productId,
      imageId,
    );
    if (!removed) {
      throw new ProductNotFoundError('Không tìm thấy ảnh');
    }
  }
}

@Injectable()
export class AddProductCertificationUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(PRODUCT_CERTIFICATION_REPOSITORY)
    private readonly productCertificationRepository: ProductCertificationRepositoryPort,
    @Inject(STORED_FILE_ACCESS)
    private readonly storedFileAccess: StoredFileAccessPort,
  ) {}

  async execute(
    productId: string,
    sellerId: string,
    input: CreateProductCertificationInput,
  ): Promise<ProductCertificationModel> {
    const product = await findProductOrFail(this.productRepository, productId);
    assertProductOwner(product, sellerId, 'thêm chứng nhận cho');
    try {
      await this.storedFileAccess.attachOwnedFile({
        fileId: input.storedFileId,
        ownerId: sellerId,
        assetType: 'CERTIFICATION',
        resourceType: 'PRODUCT',
        resourceId: productId,
      });
    } catch {
      throw new InvalidProductCertificationFileError(
        'Tệp chứng nhận không hợp lệ hoặc không thuộc người bán',
      );
    }
    return this.productCertificationRepository.addCertification(
      productId,
      input,
    );
  }
}

@Injectable()
export class RemoveProductCertificationUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(PRODUCT_CERTIFICATION_REPOSITORY)
    private readonly productCertificationRepository: ProductCertificationRepositoryPort,
  ) {}

  async execute(
    productId: string,
    certId: string,
    sellerId: string,
  ): Promise<void> {
    const product = await findProductOrFail(this.productRepository, productId);
    assertProductOwner(product, sellerId, 'xóa chứng nhận của');
    const removed =
      await this.productCertificationRepository.removeCertificationByProduct(
        productId,
        certId,
      );
    if (!removed) {
      throw new ProductCertificationNotFoundError('Không tìm thấy chứng nhận');
    }
  }
}

@Injectable()
export class ListPendingProductCertificationsUseCase {
  constructor(
    @Inject(PRODUCT_CERTIFICATION_REPOSITORY)
    private readonly productCertificationRepository: ProductCertificationRepositoryPort,
  ) {}

  execute(): Promise<ProductCertificationModel[]> {
    return this.productCertificationRepository.findPending();
  }
}

@Injectable()
export class VerifyProductCertificationUseCase {
  constructor(
    @Inject(PRODUCT_CERTIFICATION_REPOSITORY)
    private readonly productCertificationRepository: ProductCertificationRepositoryPort,
    @Inject(STORED_FILE_ACCESS)
    private readonly storedFileAccess: StoredFileAccessPort,
  ) {}

  async execute(
    certId: string,
    adminId: string,
    reviewerRole: UserRole,
    input: VerifyProductCertificationInput,
  ): Promise<ProductCertificationModel> {
    const certification =
      await this.productCertificationRepository.findByIdWithProduct(certId);
    if (!certification) {
      throw new ProductCertificationNotFoundError('Không tìm thấy chứng nhận');
    }
    assertValidCertificationVerification(input);

    certification.status = input.status;
    certification.isVerified = input.status === CertificationStatus.VERIFIED;
    certification.verifiedBy = adminId;
    certification.verifiedAt = new Date();
    certification.rejectionReason =
      input.status === CertificationStatus.REJECTED
        ? input.rejectionReason!.trim()
        : null;
    const saved =
      await this.productCertificationRepository.saveCertification(
        certification,
      );
    if (saved.storedFileId) {
      await this.storedFileAccess.reviewFile({
        fileId: saved.storedFileId,
        reviewerRole,
        approve: input.status === CertificationStatus.VERIFIED,
      });
    }
    return saved;
  }
}

@Injectable()
export class AddWishlistItemUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(PRODUCT_WISHLIST_REPOSITORY)
    private readonly productWishlistRepository: ProductWishlistRepositoryPort,
  ) {}

  async execute(userId: string, productId: string): Promise<WishlistModel> {
    const product = await this.productRepository.findActiveById(productId);
    assertWishlistProductIsAvailable(product);
    return this.productWishlistRepository.addIfAbsent(userId, productId);
  }
}

@Injectable()
export class RemoveWishlistItemUseCase {
  constructor(
    @Inject(PRODUCT_WISHLIST_REPOSITORY)
    private readonly productWishlistRepository: ProductWishlistRepositoryPort,
  ) {}

  execute(userId: string, productId: string): Promise<void> {
    return this.productWishlistRepository.remove(userId, productId);
  }
}

@Injectable()
export class ListWishlistUseCase {
  constructor(
    @Inject(PRODUCT_WISHLIST_REPOSITORY)
    private readonly productWishlistRepository: ProductWishlistRepositoryPort,
  ) {}

  execute(
    userId: string,
    query: WishlistQueryInput,
  ): Promise<{
    data: ProductModel[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.productWishlistRepository.getWishlist(userId, query);
  }
}

@Injectable()
export class ListWishlistedProductIdsUseCase {
  constructor(
    @Inject(PRODUCT_WISHLIST_REPOSITORY)
    private readonly productWishlistRepository: ProductWishlistRepositoryPort,
  ) {}

  execute(userId: string): Promise<string[]> {
    return this.productWishlistRepository.getWishlistedIds(userId);
  }
}

@Injectable()
export class ListProductCategoriesUseCase {
  constructor(
    @Inject(PRODUCT_CATEGORY_QUERY)
    private readonly productCategoryQuery: ProductCategoryQueryPort,
  ) {}

  execute(): Promise<ProductCategoryModel[]> {
    return this.productCategoryQuery.findRootCategories();
  }
}

@Injectable()
export class GetProductCategoryTreeUseCase {
  constructor(
    @Inject(PRODUCT_CATEGORY_QUERY)
    private readonly productCategoryQuery: ProductCategoryQueryPort,
  ) {}

  execute(): Promise<ProductCategoryModel[]> {
    return this.productCategoryQuery.getCategoryTree();
  }
}
