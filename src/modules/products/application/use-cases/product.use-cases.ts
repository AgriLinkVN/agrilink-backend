import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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
import { Product } from '../../domain/entities/product.entity';
import { ProductCategory } from '../../domain/entities/product-category.entity';
import { ProductCertification } from '../../domain/entities/product-certification.entity';
import { ProductImage } from '../../domain/entities/product-image.entity';
import { Wishlist } from '../../domain/entities/wishlist.entity';
import { ProductDetailResponse } from '../models/product-detail.model';
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
): Promise<Product> {
  const product = await productRepository.findByIdWithRelations(productId);
  if (!product) {
    throw new NotFoundException('Không tìm thấy sản phẩm');
  }
  return product;
}

function assertProductOwner(
  product: Product,
  sellerId: string,
  action: string,
): void {
  if (product.sellerId !== sellerId) {
    throw new ForbiddenException(`Bạn không có quyền ${action} sản phẩm này`);
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
    sellerType: SellerType,
    input: CreateProductInput,
  ): Promise<Product> {
    return this.productRepository.create(sellerId, sellerType, input);
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
  ): Promise<{ data: Product[]; total: number }> {
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
      throw new NotFoundException('Không tìm thấy sản phẩm');
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
  ): Promise<{ data: Product[]; total: number }> {
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
  ): Promise<Product> {
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
  ): Promise<Product> {
    const product = await findProductOrFail(this.productRepository, id);
    const previousStatus = product.status;
    const isOwner = product.sellerId === actorId;
    const isReviewer = [UserRole.ADMIN, UserRole.STATE_AGENCY].includes(actorRole);

    if (!isOwner && !isReviewer) {
      throw new ForbiddenException('Bạn không có quyền đổi trạng thái sản phẩm này');
    }
    if (previousStatus === nextStatus) {
      return product;
    }
    if (!this.getAllowedTargets(previousStatus).includes(nextStatus)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái sản phẩm từ ${previousStatus} sang ${nextStatus}`,
      );
    }
    this.assertTransitionPermission(previousStatus, nextStatus, isOwner, isReviewer);
    if (nextStatus === ProductStatus.ACTIVE && Number(product.availableQuantity) <= 0) {
      throw new BadRequestException('Sản phẩm phải có số lượng tồn kho lớn hơn 0 để kích hoạt');
    }

    product.status = nextStatus;
    product.rejectionReason = null;
    const saved = await this.productRepository.save(product);
    await this.publishStatusChanged(saved, previousStatus);
    return saved;
  }

  private getAllowedTargets(currentStatus: ProductStatus): ProductStatus[] {
    const flow: Partial<Record<ProductStatus, ProductStatus[]>> = {
      [ProductStatus.DRAFT]: [ProductStatus.PENDING_APPROVAL],
      [ProductStatus.REJECTED]: [ProductStatus.PENDING_APPROVAL],
      [ProductStatus.PENDING_APPROVAL]: [ProductStatus.ACTIVE],
      [ProductStatus.ACTIVE]: [ProductStatus.OUT_OF_STOCK],
      [ProductStatus.OUT_OF_STOCK]: [ProductStatus.ACTIVE],
    };
    return flow[currentStatus] ?? [];
  }

  private assertTransitionPermission(
    currentStatus: ProductStatus,
    nextStatus: ProductStatus,
    isOwner: boolean,
    isReviewer: boolean,
  ): void {
    if (nextStatus === ProductStatus.PENDING_APPROVAL && !isOwner) {
      throw new ForbiddenException('Chỉ người bán mới được gửi sản phẩm chờ duyệt');
    }
    if (
      currentStatus === ProductStatus.PENDING_APPROVAL &&
      nextStatus === ProductStatus.ACTIVE &&
      !isReviewer
    ) {
      throw new ForbiddenException('Chỉ admin hoặc cơ quan quản lý mới được duyệt sản phẩm');
    }
    if (
      currentStatus === ProductStatus.OUT_OF_STOCK &&
      nextStatus === ProductStatus.ACTIVE &&
      !isOwner &&
      !isReviewer
    ) {
      throw new ForbiddenException('Bạn không có quyền mở bán lại sản phẩm này');
    }
    if (nextStatus === ProductStatus.OUT_OF_STOCK && !isOwner && !isReviewer) {
      throw new ForbiddenException('Bạn không có quyền đánh dấu hết hàng');
    }
  }

  private async publishStatusChanged(
    product: Product,
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
  ): Promise<ProductImage> {
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

  async execute(productId: string, imageId: string, sellerId: string): Promise<void> {
    const product = await findProductOrFail(this.productRepository, productId);
    assertProductOwner(product, sellerId, 'xóa ảnh của');
    const removed = await this.productImageRepository.removeImageByProduct(productId, imageId);
    if (!removed) {
      throw new NotFoundException('Không tìm thấy ảnh');
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
  ) {}

  async execute(
    productId: string,
    sellerId: string,
    input: CreateProductCertificationInput,
  ): Promise<ProductCertification> {
    const product = await findProductOrFail(this.productRepository, productId);
    assertProductOwner(product, sellerId, 'thêm chứng nhận cho');
    return this.productCertificationRepository.addCertification(productId, input);
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

  async execute(productId: string, certId: string, sellerId: string): Promise<void> {
    const product = await findProductOrFail(this.productRepository, productId);
    assertProductOwner(product, sellerId, 'xóa chứng nhận của');
    const removed = await this.productCertificationRepository.removeCertificationByProduct(
      productId,
      certId,
    );
    if (!removed) {
      throw new NotFoundException('Không tìm thấy chứng nhận');
    }
  }
}

@Injectable()
export class ListPendingProductCertificationsUseCase {
  constructor(
    @Inject(PRODUCT_CERTIFICATION_REPOSITORY)
    private readonly productCertificationRepository: ProductCertificationRepositoryPort,
  ) {}

  execute(): Promise<ProductCertification[]> {
    return this.productCertificationRepository.findPending();
  }
}

@Injectable()
export class VerifyProductCertificationUseCase {
  constructor(
    @Inject(PRODUCT_CERTIFICATION_REPOSITORY)
    private readonly productCertificationRepository: ProductCertificationRepositoryPort,
  ) {}

  async execute(
    certId: string,
    adminId: string,
    input: VerifyProductCertificationInput,
  ): Promise<ProductCertification> {
    const certification = await this.productCertificationRepository.findByIdWithProduct(certId);
    if (!certification) {
      throw new NotFoundException('Không tìm thấy chứng nhận');
    }
    if (input.status === CertificationStatus.PENDING) {
      throw new BadRequestException('Trạng thái duyệt phải là verified hoặc rejected');
    }
    if (input.status === CertificationStatus.REJECTED && !input.rejectionReason?.trim()) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối chứng nhận');
    }

    certification.status = input.status;
    certification.isVerified = input.status === CertificationStatus.VERIFIED;
    certification.verifiedBy = adminId;
    certification.verifiedAt = new Date();
    certification.rejectionReason =
      input.status === CertificationStatus.REJECTED
        ? input.rejectionReason!.trim()
        : null;
    return this.productCertificationRepository.saveCertification(certification);
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

  async execute(userId: string, productId: string): Promise<Wishlist> {
    const product = await this.productRepository.findActiveById(productId);
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm hoạt động');
    }
    const existing = await this.productWishlistRepository.findByUserAndProduct(userId, productId);
    return existing ?? this.productWishlistRepository.addWishlist(userId, productId);
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
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
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

  execute(): Promise<ProductCategory[]> {
    return this.productCategoryQuery.findRootCategories();
  }
}

@Injectable()
export class GetProductCategoryTreeUseCase {
  constructor(
    @Inject(PRODUCT_CATEGORY_QUERY)
    private readonly productCategoryQuery: ProductCategoryQueryPort,
  ) {}

  execute(): Promise<ProductCategory[]> {
    return this.productCategoryQuery.getCategoryTree();
  }
}
