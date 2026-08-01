import { ProductStatus, SellerType } from '@common/enums';
import {
  CreateProductCertificationInput,
  CreateProductInput,
  ProductFilterInput,
  WishlistQueryInput,
} from '../../models/product-input.model';
import { ProductDetailResponse } from '../../models/product-detail.model';
import {
  ProductCategoryModel,
  ProductCertificationModel,
  ProductImageModel,
  ProductModel,
  WishlistModel,
} from '../../models/product.model';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
export const PRODUCT_CATALOG_QUERY = Symbol('PRODUCT_CATALOG_QUERY');
export const PRODUCT_DETAIL_QUERY = Symbol('PRODUCT_DETAIL_QUERY');
export const PRODUCT_CATEGORY_QUERY = Symbol('PRODUCT_CATEGORY_QUERY');
export const PRODUCT_IMAGE_REPOSITORY = Symbol('PRODUCT_IMAGE_REPOSITORY');
export const PRODUCT_CERTIFICATION_REPOSITORY = Symbol(
  'PRODUCT_CERTIFICATION_REPOSITORY',
);
export const PRODUCT_WISHLIST_REPOSITORY = Symbol('PRODUCT_WISHLIST_REPOSITORY');
export const PRODUCT_SEED_REPOSITORY = Symbol('PRODUCT_SEED_REPOSITORY');
export const PRODUCT_REVIEW_QUERY = Symbol('PRODUCT_REVIEW_QUERY');
export const PRODUCT_COMMERCE_QUERY = Symbol('PRODUCT_COMMERCE_QUERY');
export const PRODUCT_ADMIN_QUERY = Symbol('PRODUCT_ADMIN_QUERY');
export const PRODUCT_MODERATION_REPOSITORY = Symbol(
  'PRODUCT_MODERATION_REPOSITORY',
);

export interface ProductRepositoryPort {
  createAtomically(
    sellerId: string,
    sellerType: SellerType,
    input: CreateProductInput,
  ): Promise<ProductModel>;
  findByIdWithRelations(id: string): Promise<ProductModel | null>;
  findActiveById(id: string): Promise<ProductModel | null>;
  save(product: ProductModel): Promise<ProductModel>;
}

export interface ProductCatalogQueryPort {
  findAll(
    filter: ProductFilterInput,
    currentUserId?: string,
  ): Promise<{ data: ProductModel[]; total: number }>;
  findMine(
    sellerId: string,
    filter: ProductFilterInput,
  ): Promise<{ data: ProductModel[]; total: number }>;
}

export interface ProductDetailQueryPort {
  findOne(id: string): Promise<ProductDetailResponse | null>;
}

export interface ProductCategoryQueryPort {
  findRootCategories(): Promise<ProductCategoryModel[]>;
  getCategoryTree(): Promise<ProductCategoryModel[]>;
  findAllCategories(): Promise<ProductCategoryModel[]>;
}

export interface ProductImageRepositoryPort {
  addImage(
    productId: string,
    imageUrl: string,
    isPrimary: boolean,
  ): Promise<ProductImageModel>;
  removeImageByProduct(productId: string, imageId: string): Promise<boolean>;
}

export interface ProductCertificationRepositoryPort {
  addCertification(
    productId: string,
    input: CreateProductCertificationInput,
  ): Promise<ProductCertificationModel>;
  findPending(): Promise<ProductCertificationModel[]>;
  findByIdWithProduct(certId: string): Promise<ProductCertificationModel | null>;
  saveCertification(
    certification: ProductCertificationModel,
  ): Promise<ProductCertificationModel>;
  transitionCertification(
    certificationId: string,
    expectedStatus: ProductCertificationModel['status'],
    transition: Pick<
      ProductCertificationModel,
      | 'status'
      | 'isVerified'
      | 'verifiedBy'
      | 'verifiedAt'
      | 'rejectionReason'
    >,
  ): Promise<ProductCertificationModel | null>;
  restoreCertificationTransition(
    certificationId: string,
    transitionedState: Pick<
      ProductCertificationModel,
      'status' | 'verifiedBy' | 'verifiedAt'
    >,
    previousState: Pick<
      ProductCertificationModel,
      | 'status'
      | 'isVerified'
      | 'verifiedBy'
      | 'verifiedAt'
      | 'rejectionReason'
    >,
  ): Promise<boolean>;
  removeCertificationByProduct(
    productId: string,
    certId: string,
  ): Promise<boolean>;
}

export interface ProductWishlistRepositoryPort {
  findByUserAndProduct(
    userId: string,
    productId: string,
  ): Promise<WishlistModel | null>;
  addIfAbsent(userId: string, productId: string): Promise<WishlistModel>;
  remove(userId: string, productId: string): Promise<void>;
  getWishlist(
    userId: string,
    query: WishlistQueryInput,
  ): Promise<{ data: ProductModel[]; total: number; page: number; limit: number }>;
  getWishlistedIds(userId: string): Promise<string[]>;
}

export interface ProductSeedRepositoryPort {
  seedCategories(): Promise<void>;
  countProducts(): Promise<number>;
  resetProducts(): Promise<number>;
  saveSeedProducts(products: Array<Partial<ProductModel>>): Promise<ProductModel[]>;
  savePrimaryImagesForProducts(
    products: ProductModel[],
    imageUrl: string,
  ): Promise<void>;
}

export interface ProductReviewQueryPort {
  findReviewContext(
    productId: string,
  ): Promise<{ id: string; sellerId: string; name: string | null } | null>;
  findReviewSummariesByIds(
    ids: string[],
  ): Promise<Array<{ id: string; name: string | null }>>;
}

export interface ProductCommerceQueryPort {
  findCommerceProduct(productId: string): Promise<{
    id: string;
    sellerId: string;
    name: string;
    pricePerUnit: string;
    unit: string;
  } | null>;
}

export interface ProductAdminQueryPort {
  countAllProducts(): Promise<number>;
  countProductsByStatus(status: ProductStatus): Promise<number>;
  findAdminProduct(id: string): Promise<ProductModel | null>;
  findAdminProductsByStatuses(
    statuses: ProductStatus[],
    skip: number,
    take: number,
    orderBy: 'createdAt' | 'updatedAt',
  ): Promise<{ data: ProductModel[]; total: number }>;
}

export interface ProductModerationRepositoryPort {
  updateStatusConditionally(
    id: string,
    expectedStatus: ProductStatus,
    status: ProductStatus,
    rejectionReason: string | null,
  ): Promise<ProductModel | null>;
}
