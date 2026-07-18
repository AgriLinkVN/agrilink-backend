import { SellerType } from '@common/enums';
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
