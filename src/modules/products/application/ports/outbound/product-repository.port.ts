import { SellerType } from '@common/enums';
import { Product } from '../../../domain/entities/product.entity';
import { ProductCategory } from '../../../domain/entities/product-category.entity';
import { ProductCertification } from '../../../domain/entities/product-certification.entity';
import { ProductImage } from '../../../domain/entities/product-image.entity';
import { Wishlist } from '../../../domain/entities/wishlist.entity';
import {
  CreateProductCertificationInput,
  CreateProductInput,
  ProductFilterInput,
  WishlistQueryInput,
} from '../../models/product-input.model';
import { ProductDetailResponse } from '../../models/product-detail.model';

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
  ): Promise<Product>;
  findByIdWithRelations(id: string): Promise<Product | null>;
  findActiveById(id: string): Promise<Product | null>;
  save(product: Product): Promise<Product>;
}

export interface ProductCatalogQueryPort {
  findAll(
    filter: ProductFilterInput,
    currentUserId?: string,
  ): Promise<{ data: Product[]; total: number }>;
  findMine(
    sellerId: string,
    filter: ProductFilterInput,
  ): Promise<{ data: Product[]; total: number }>;
}

export interface ProductDetailQueryPort {
  findOne(id: string): Promise<ProductDetailResponse | null>;
}

export interface ProductCategoryQueryPort {
  findRootCategories(): Promise<ProductCategory[]>;
  getCategoryTree(): Promise<ProductCategory[]>;
  findAllCategories(): Promise<ProductCategory[]>;
}

export interface ProductImageRepositoryPort {
  addImage(
    productId: string,
    imageUrl: string,
    isPrimary: boolean,
  ): Promise<ProductImage>;
  removeImageByProduct(productId: string, imageId: string): Promise<boolean>;
}

export interface ProductCertificationRepositoryPort {
  addCertification(
    productId: string,
    input: CreateProductCertificationInput,
  ): Promise<ProductCertification>;
  findPending(): Promise<ProductCertification[]>;
  findByIdWithProduct(certId: string): Promise<ProductCertification | null>;
  saveCertification(
    certification: ProductCertification,
  ): Promise<ProductCertification>;
  removeCertificationByProduct(
    productId: string,
    certId: string,
  ): Promise<boolean>;
}

export interface ProductWishlistRepositoryPort {
  findByUserAndProduct(
    userId: string,
    productId: string,
  ): Promise<Wishlist | null>;
  addIfAbsent(userId: string, productId: string): Promise<Wishlist>;
  remove(userId: string, productId: string): Promise<void>;
  getWishlist(
    userId: string,
    query: WishlistQueryInput,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }>;
  getWishlistedIds(userId: string): Promise<string[]>;
}

export interface ProductSeedRepositoryPort {
  seedCategories(): Promise<void>;
  countProducts(): Promise<number>;
  resetProducts(): Promise<number>;
  saveSeedProducts(products: Array<Partial<Product>>): Promise<Product[]>;
  savePrimaryImagesForProducts(
    products: Product[],
    imageUrl: string,
  ): Promise<void>;
}
