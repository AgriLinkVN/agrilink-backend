import { Injectable } from '@nestjs/common';

import {
  CreateProductCertificationInput,
  CreateProductInput,
  ProductFilterInput,
  UpdateProductInput,
  VerifyProductCertificationInput,
  WishlistQueryInput,
} from './models/product-input.model';
import {
  ProductStatus,
  SellerType,
  UserRole,
} from '@common/enums';
import {
  AddProductCertificationUseCase,
  AddProductImageUseCase,
  AddWishlistItemUseCase,
  ChangeProductStatusUseCase,
  CreateProductUseCase,
  DeleteProductUseCase,
  GetProductCategoryTreeUseCase,
  GetProductDetailUseCase,
  ListPendingProductCertificationsUseCase,
  ListProductCategoriesUseCase,
  ListPublicProductsUseCase,
  ListSellerProductsUseCase,
  ListWishlistUseCase,
  ListWishlistedProductIdsUseCase,
  RemoveProductCertificationUseCase,
  RemoveProductImageUseCase,
  RemoveWishlistItemUseCase,
  UpdateProductUseCase,
  VerifyProductCertificationUseCase,
} from './use-cases/product.use-cases';

@Injectable()
export class ProductsService {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly listPublicProductsUseCase: ListPublicProductsUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly listSellerProductsUseCase: ListSellerProductsUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly changeProductStatusUseCase: ChangeProductStatusUseCase,
    private readonly addProductImageUseCase: AddProductImageUseCase,
    private readonly removeProductImageUseCase: RemoveProductImageUseCase,
    private readonly addProductCertificationUseCase: AddProductCertificationUseCase,
    private readonly removeProductCertificationUseCase: RemoveProductCertificationUseCase,
    private readonly listPendingProductCertificationsUseCase: ListPendingProductCertificationsUseCase,
    private readonly verifyProductCertificationUseCase: VerifyProductCertificationUseCase,
    private readonly addWishlistItemUseCase: AddWishlistItemUseCase,
    private readonly removeWishlistItemUseCase: RemoveWishlistItemUseCase,
    private readonly listWishlistUseCase: ListWishlistUseCase,
    private readonly listWishlistedProductIdsUseCase: ListWishlistedProductIdsUseCase,
    private readonly listProductCategoriesUseCase: ListProductCategoriesUseCase,
    private readonly getProductCategoryTreeUseCase: GetProductCategoryTreeUseCase,
  ) { }

  // ─── Categories ───────────────────────────────────────────────

  /** Root categories only (parentId null) — used by `GET /products/categories`. */
  findCategories() {
    return this.listProductCategoriesUseCase.execute();
  }

  /** Full 2-level tree (roots + nested children) — used by search filter. */
  getCategoryTree() {
    return this.getProductCategoryTreeUseCase.execute();
  }

  // ─── Create ──────────────────────────────────────────────────

  create(
    sellerId: string,
    sellerType: SellerType | undefined,
    role: UserRole,
    dto: CreateProductInput,
  ) {
    return this.createProductUseCase.execute(sellerId, sellerType, role, dto);
  }

  // ─── Find All + Filter ────────────────────────────────────────

  findAll(
    filter: ProductFilterInput,
    currentUserId?: string,
  ) {
    return this.listPublicProductsUseCase.execute(filter, currentUserId);
  }

  findMine(
    sellerId: string,
    filter: ProductFilterInput,
  ) {
    return this.listSellerProductsUseCase.execute(sellerId, filter);
  }

  // ─── Find One ─────────────────────────────────────────────────

  /**
   * GET /products/:id — full detail with seller info populated via raw queries
   * (avoids cross-module entity coupling with P1's auth/profiles).
   */
  findOne(id: string) {
    return this.getProductDetailUseCase.execute(id);
  }

  // ─── Update ───────────────────────────────────────────────────

  update(id: string, sellerId: string, dto: UpdateProductInput) {
    return this.updateProductUseCase.execute(id, sellerId, dto);
  }

  updateStatus(
    id: string,
    actorId: string,
    actorRole: UserRole,
    nextStatus: ProductStatus,
  ) {
    return this.changeProductStatusUseCase.execute(
      id,
      actorId,
      actorRole,
      nextStatus,
    );
  }

  // ─── Remove ───────────────────────────────────────────────────

  remove(id: string, sellerId: string) {
    return this.deleteProductUseCase.execute(id, sellerId);
  }

  // ─── Images ───────────────────────────────────────────────────

  addImage(
    productId: string,
    sellerId: string,
    imageUrl: string,
    isPrimary: boolean,
  ) {
    return this.addProductImageUseCase.execute(
      productId,
      sellerId,
      imageUrl,
      isPrimary,
    );
  }

  removeImage(productId: string, imageId: string, sellerId: string) {
    return this.removeProductImageUseCase.execute(productId, imageId, sellerId);
  }

  // ─── Certifications ───────────────────────────────────────────

  addCertification(
    productId: string,
    sellerId: string,
    dto: CreateProductCertificationInput,
  ) {
    return this.addProductCertificationUseCase.execute(productId, sellerId, dto);
  }

  findPendingCertifications() {
    return this.listPendingProductCertificationsUseCase.execute();
  }

  verifyCertification(
    certId: string,
    adminId: string,
    dto: VerifyProductCertificationInput,
  ) {
    return this.verifyProductCertificationUseCase.execute(certId, adminId, dto);
  }

  removeCertification(productId: string, certId: string, sellerId: string) {
    return this.removeProductCertificationUseCase.execute(
      productId,
      certId,
      sellerId,
    );
  }

  // ─── Wishlist ─────────────────────────────────────────────────

  addToWishlist(userId: string, productId: string) {
    return this.addWishlistItemUseCase.execute(userId, productId);
  }

  removeFromWishlist(userId: string, productId: string) {
    return this.removeWishlistItemUseCase.execute(userId, productId);
  }

  getWishlist(
    userId: string,
    query: WishlistQueryInput,
  ) {
    return this.listWishlistUseCase.execute(userId, query);
  }

  getWishlistedIds(userId: string) {
    return this.listWishlistedProductIdsUseCase.execute(userId);
  }

}
