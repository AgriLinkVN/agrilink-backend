import {
  Inject,
  Injectable,
} from '@nestjs/common';

import { Product } from '../domain/entities/product.entity';
import {
  CreateProductCertificationInput,
  CreateProductInput,
  ProductFilterInput,
  UpdateProductInput,
  VerifyProductCertificationInput,
  WishlistQueryInput,
} from './models/product-input.model';
import {
  PRODUCT_CATEGORY_QUERY,
  PRODUCT_SEED_REPOSITORY,
  ProductCategoryQueryPort,
  ProductSeedRepositoryPort,
} from './ports/outbound/product-repository.port';
import {
  FarmingType,
  ProductStatus,
  ProductUnit,
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
    @Inject(PRODUCT_CATEGORY_QUERY)
    private readonly productCategoryQuery: ProductCategoryQueryPort,
    @Inject(PRODUCT_SEED_REPOSITORY)
    private readonly productSeedRepository: ProductSeedRepositoryPort,
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

  async seedCategories(): Promise<void> {
    await this.productSeedRepository.seedCategories();
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

  // ─── Dev seed ─────────────────────────────────────────────────

  async resetAndSeed(): Promise<{ deleted: number; seeded: number }> {
    const deleted = await this.productSeedRepository.resetProducts();
    const result = await this.seedMockData();
    return { deleted, seeded: result.seeded };
  }

  async seedMockData(): Promise<{ seeded: number; skipped: number }> {
    const existing = await this.productSeedRepository.countProducts();
    if (existing > 0) return { seeded: 0, skipped: existing };

    const F = '00000000-0000-0000-0000-000000000001'; // farmer
    const C = '00000000-0000-0000-0000-000000000002'; // cooperative
    const S = '00000000-0000-0000-0000-000000000003'; // supplier

    const cats = await this.productCategoryQuery.findAllCategories();
    const catId = (slug: string): string | undefined =>
      cats.find((c) => c.slug === slug)?.id;

    const TC  = catId('trai-cay');
    const RAU = catId('rau-cu-qua');
    const GAO = catId('lua-gao-ngu-coc');
    const TS  = catId('thuy-san');
    const GS  = catId('gia-suc-gia-cam');
    const CF  = catId('ca-phe-che');
    const GV  = catId('gia-vi-thao-moc');
    const HD  = catId('hat-dau');
    const MO  = catId('mat-ong-dac-san');
    const HOA = catId('hoa-cay-canh');

    type P = Partial<Product>;

    const mockProducts: P[] = [
      // ── Trái cây ──────────────────────────────────────────────
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: TC, name: 'Xoài cát Hòa Lộc loại 1', description: 'Xoài cát Hòa Lộc chính gốc Tiền Giang, trái to đều, vỏ vàng óng, thịt dày ngọt thơm, ít xơ. Canh tác theo tiêu chuẩn VietGAP, không sử dụng chất kích thích tăng trưởng.', pricePerUnit: 45000, unit: ProductUnit.KG, availableQuantity: 500, minOrderQuantity: 10, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 1284, harvestDate: new Date('2026-06-15'), expiryDate: new Date('2026-06-22') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: TC, name: 'Thanh long ruột đỏ xuất khẩu', description: 'Thanh long ruột đỏ Bình Thuận đạt chuẩn GlobalGAP, đủ điều kiện xuất khẩu sang EU và Nhật Bản. Trái đều, màu đỏ đậm, vị ngọt thanh.', pricePerUnit: 35000, unit: ProductUnit.KG, availableQuantity: 1000, minOrderQuantity: 50, farmingType: FarmingType.GLOBALGAP, status: ProductStatus.ACTIVE, viewCount: 2105, harvestDate: new Date('2026-06-20'), expiryDate: new Date('2026-06-27') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: TC, name: 'Sầu riêng Ri6 Cai Lậy', description: 'Sầu riêng Ri6 vùng Cai Lậy – Tiền Giang, cơm vàng hạt lép, mùi thơm nồng đặc trưng. Thu hoạch đúng độ chín, không dùng chất thúc chín.', pricePerUnit: 85000, unit: ProductUnit.KG, availableQuantity: 600, minOrderQuantity: 5, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 3250, harvestDate: new Date('2026-07-15'), expiryDate: new Date('2026-07-22') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: TC, name: 'Bưởi da xanh Bến Tre', description: 'Bưởi da xanh đặc sản Bến Tre, vỏ xanh bóng, múi to, tép mọng nước, vị ngọt ít đắng. Đạt VietGAP, trái đồng đều từ 1.2–1.8kg/trái.', pricePerUnit: 32000, unit: ProductUnit.KG, availableQuantity: 800, minOrderQuantity: 10, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 1120, harvestDate: new Date('2026-07-01'), expiryDate: new Date('2026-07-20') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: TC, name: 'Dưa hấu không hạt Long An', description: 'Dưa hấu không hạt trồng tại Long An, vỏ mỏng, ruột đỏ tươi, ngọt sắc. Trọng lượng 3–6kg/quả. Thích hợp dùng ngay hoặc làm nước ép.', pricePerUnit: 18000, unit: ProductUnit.KG, availableQuantity: 3000, minOrderQuantity: 30, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 987, harvestDate: new Date('2026-06-10'), expiryDate: new Date('2026-06-20') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: TC, name: 'Nhãn lồng Hưng Yên', description: 'Nhãn lồng chính gốc Hưng Yên, cùi dày, hạt nhỏ, vị ngọt đậm thơm. Mùa vụ tháng 7–8, thu hái khi trái chín đều. Không ướp hóa chất bảo quản.', pricePerUnit: 55000, unit: ProductUnit.KG, availableQuantity: 400, minOrderQuantity: 5, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 1890, harvestDate: new Date('2026-07-20'), expiryDate: new Date('2026-07-30') },
      { sellerId: S, sellerType: SellerType.SUPPLIER, categoryId: TC, name: 'Vải thiều Lục Ngạn Bắc Giang', description: 'Vải thiều Lục Ngạn được cấp chỉ dẫn địa lý, xuất khẩu sang 30 quốc gia. Vỏ đỏ tươi, hạt nhỏ, cùi giòn ngọt. Đạt GlobalGAP và OCOP 4 sao.', pricePerUnit: 42000, unit: ProductUnit.KG, availableQuantity: 1500, minOrderQuantity: 20, farmingType: FarmingType.GLOBALGAP, status: ProductStatus.ACTIVE, viewCount: 4120, harvestDate: new Date('2026-06-05'), expiryDate: new Date('2026-06-15') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: TC, name: 'Cam sành Hà Giang', description: 'Cam sành vùng cao Hà Giang, vỏ sần xù đặc trưng, ruột vàng cam đẹp, vị chua ngọt hài hòa, nhiều vitamin C. Không dùng thuốc kích màu.', pricePerUnit: 38000, unit: ProductUnit.KG, availableQuantity: 700, minOrderQuantity: 10, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 654, harvestDate: new Date('2026-01-15'), expiryDate: new Date('2026-02-28') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: TC, name: 'Dứa MD2 Ninh Bình', description: 'Dứa MD2 (dứa vàng) nhập giống từ Hawaii, trồng tại Ninh Bình. Ruột vàng, ít xơ, độ Brix 15–17, ngọt hơn dứa Queen thông thường 30%.', pricePerUnit: 28000, unit: ProductUnit.KG, availableQuantity: 900, minOrderQuantity: 15, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 776, harvestDate: new Date('2026-05-10'), expiryDate: new Date('2026-05-25') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: TC, name: 'Ổi lê Đài Loan không hạt', description: 'Ổi lê không hạt trồng theo quy trình VietGAP tại Bình Dương. Trái to tròn, vỏ xanh mướt, ruột trắng giòn ngọt nhẹ. Thích hợp làm quà biếu.', pricePerUnit: 35000, unit: ProductUnit.KG, availableQuantity: 300, minOrderQuantity: 5, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 512, harvestDate: new Date('2026-05-20'), expiryDate: new Date('2026-05-30') },

      // ── Rau củ ────────────────────────────────────────────────
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: RAU, name: 'Rau muống hữu cơ Đà Lạt', description: 'Rau muống trồng theo hướng hữu cơ tại Đà Lạt, không thuốc trừ sâu, tươi ngon mỗi ngày. Phù hợp bếp ăn gia đình và nhà hàng.', pricePerUnit: 25000, unit: ProductUnit.KG, availableQuantity: 200, minOrderQuantity: 5, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 892, harvestDate: new Date('2026-06-01'), expiryDate: new Date('2026-06-05') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: RAU, name: 'Rau cải bắp VietGAP Lâm Đồng', description: 'Bắp cải trắng trồng tại cao nguyên Lâm Đồng 900m, khí hậu mát mẻ giúp cải giòn chắc, lá xanh đậm. Đạt chứng nhận VietGAP, cung cấp siêu thị.', pricePerUnit: 12000, unit: ProductUnit.KG, availableQuantity: 2000, minOrderQuantity: 50, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 445, harvestDate: new Date('2026-05-28'), expiryDate: new Date('2026-06-05') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: RAU, name: 'Cà chua bi hữu cơ Đà Lạt', description: 'Cà chua bi hữu cơ 100% Đà Lạt, trồng trong nhà kính. Trái nhỏ đỏ đều, vị chua ngọt đậm, giàu lycopene. Không thuốc trừ sâu, phân hóa học.', pricePerUnit: 48000, unit: ProductUnit.KG, availableQuantity: 150, minOrderQuantity: 3, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 1230, harvestDate: new Date('2026-06-03'), expiryDate: new Date('2026-06-10') },
      { sellerId: S, sellerType: SellerType.SUPPLIER, categoryId: RAU, name: 'Khoai lang tím Nhật Vĩnh Long', description: 'Khoai lang tím giống Nhật trồng tại Vĩnh Long, củ đều đẹp, ruột tím đậm, hàm lượng anthocyanin cao. Xuất khẩu sang Nhật và Hàn Quốc.', pricePerUnit: 22000, unit: ProductUnit.KG, availableQuantity: 3000, minOrderQuantity: 100, farmingType: FarmingType.GLOBALGAP, status: ProductStatus.ACTIVE, viewCount: 2340, harvestDate: new Date('2026-05-15'), expiryDate: new Date('2026-08-15') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: RAU, name: 'Bí đỏ Hokaido Gia Lai', description: 'Bí đỏ Hokaido (bí hồ lô Nhật) trồng tại Gia Lai, trọng lượng 1–2kg/quả, ruột vàng đặc, vị ngọt bùi. Tốt cho bé ăn dặm và người ăn kiêng.', pricePerUnit: 30000, unit: ProductUnit.KG, availableQuantity: 500, minOrderQuantity: 10, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 388, harvestDate: new Date('2026-06-12'), expiryDate: new Date('2026-09-12') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: RAU, name: 'Hành tím Vĩnh Châu Sóc Trăng', description: 'Hành tím Vĩnh Châu nổi tiếng cả nước, củ nhỏ chắc, màu tím đặc trưng, mùi hăng nồng. Phơi khô tự nhiên, bảo quản được 6 tháng. Đạt OCOP 3 sao.', pricePerUnit: 28000, unit: ProductUnit.KG, availableQuantity: 5000, minOrderQuantity: 50, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 1540, harvestDate: new Date('2026-04-10'), expiryDate: new Date('2026-10-10') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: RAU, name: 'Măng tây xanh Ninh Thuận', description: 'Măng tây xanh trồng tại Ninh Thuận, đất pha cát thổ nhưỡng đặc biệt. Chồi non mập mạp, giòn ngọt, giàu axit folic và vitamin K. Hái tươi hàng ngày.', pricePerUnit: 65000, unit: ProductUnit.KG, availableQuantity: 120, minOrderQuantity: 2, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 921, harvestDate: new Date('2026-06-02'), expiryDate: new Date('2026-06-05') },

      // ── Gạo ───────────────────────────────────────────────────
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: GAO, name: 'Gạo ST25 đặc sản Sóc Trăng', description: 'Gạo ST25 do ông Hồ Quang Cua lai tạo, từng đạt giải gạo ngon nhất thế giới. Hạt dài, cơm thơm dẻo, vị ngọt tự nhiên.', pricePerUnit: 28000, unit: ProductUnit.KG, availableQuantity: 2000, minOrderQuantity: 20, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 5432, harvestDate: new Date('2026-05-30'), expiryDate: new Date('2027-05-30') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: GAO, name: 'Gạo hữu cơ Séng Cù Mường Khương', description: 'Gạo Séng Cù hữu cơ vùng núi Mường Khương – Lào Cai 1200m. Hạt mập, cơm dẻo thơm mùi lá dứa tự nhiên. Được Nhật Bản cấp chứng nhận hữu cơ JAS.', pricePerUnit: 52000, unit: ProductUnit.KG, availableQuantity: 800, minOrderQuantity: 5, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 2180, harvestDate: new Date('2025-11-20'), expiryDate: new Date('2026-11-20') },
      { sellerId: S, sellerType: SellerType.SUPPLIER, categoryId: GAO, name: 'Nếp cái hoa vàng Hải Dương', description: 'Nếp cái hoa vàng đặc sản đồng bằng sông Hồng, hạt trắng trong, dẻo thơm đặc biệt. Dùng làm xôi, bánh chưng, rượu nếp truyền thống.', pricePerUnit: 35000, unit: ProductUnit.KG, availableQuantity: 1500, minOrderQuantity: 20, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 873, harvestDate: new Date('2025-12-01'), expiryDate: new Date('2026-12-01') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: GAO, name: 'Gạo lứt đỏ hữu cơ An Giang', description: 'Gạo lứt đỏ hữu cơ An Giang, còn nguyên cám đỏ giàu chất xơ và vitamin B. Phù hợp người ăn kiêng, tiểu đường, muốn kiểm soát cân nặng.', pricePerUnit: 32000, unit: ProductUnit.KG, availableQuantity: 600, minOrderQuantity: 5, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 1450, harvestDate: new Date('2026-04-15'), expiryDate: new Date('2027-04-15') },

      // ── Cà phê & chè ──────────────────────────────────────────
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: CF, name: 'Cà phê Arabica Cầu Đất Đà Lạt', description: 'Cà phê Arabica trồng tại vùng Cầu Đất 1500m so mực nước biển. Hữu cơ 100%, rang mộc theo phương pháp truyền thống.', pricePerUnit: 120000, unit: ProductUnit.KG, availableQuantity: 150, minOrderQuantity: 2, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 764, harvestDate: new Date('2025-12-01'), expiryDate: new Date('2026-12-01') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: CF, name: 'Cà phê Robusta Buôn Ma Thuột', description: 'Cà phê Robusta nguyên bản từ Buôn Ma Thuột – thủ phủ cà phê Tây Nguyên. Hạt to đều, rang đậm, vị đắng mạnh, hậu vị ngọt lâu. Chứng nhận UTZ.', pricePerUnit: 75000, unit: ProductUnit.KG, availableQuantity: 500, minOrderQuantity: 5, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 2890, harvestDate: new Date('2025-12-15'), expiryDate: new Date('2026-12-15') },
      { sellerId: S, sellerType: SellerType.SUPPLIER, categoryId: CF, name: 'Chè Shan Tuyết Hà Giang', description: 'Chè Shan Tuyết cổ thụ trên đỉnh núi Hà Giang 1500m. Búp trắng phủ tuyết, vị ngọt hậu dài, thơm mát. Hữu cơ tự nhiên, không phân bón hóa học.', pricePerUnit: 280000, unit: ProductUnit.KG, availableQuantity: 80, minOrderQuantity: 1, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 3420, harvestDate: new Date('2026-04-01'), expiryDate: new Date('2027-04-01') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: CF, name: 'Chè xanh Thái Nguyên loại đặc', description: 'Chè xanh Tân Cương – Thái Nguyên, búp một tôm hai lá, hái thủ công. Nước xanh vàng trong, vị chát dịu, thơm mùi cốm. Hộp thiếc 500g.', pricePerUnit: 180000, unit: ProductUnit.KG, availableQuantity: 200, minOrderQuantity: 1, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 1876, harvestDate: new Date('2026-05-01'), expiryDate: new Date('2027-05-01') },

      // ── Thủy hải sản ──────────────────────────────────────────
      { sellerId: S, sellerType: SellerType.SUPPLIER, categoryId: TS, name: 'Tôm sú sạch đông lạnh Cà Mau', description: 'Tôm sú nuôi sinh thái tại Cà Mau, thịt chắc ngọt, không kháng sinh. Đóng gói đông lạnh IQF 1kg/túi. Đạt ASC và tiêu chuẩn xuất khẩu EU.', pricePerUnit: 185000, unit: ProductUnit.KG, availableQuantity: 2000, minOrderQuantity: 5, farmingType: FarmingType.GLOBALGAP, status: ProductStatus.ACTIVE, viewCount: 4320, harvestDate: new Date('2026-05-25'), expiryDate: new Date('2026-11-25') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: TS, name: 'Cá tra phi lê đông lạnh An Giang', description: 'Cá tra phi lê nuôi tại An Giang theo quy trình ASC. Thịt trắng mịn, không mùi bùn, đạt tiêu chuẩn xuất khẩu Mỹ và EU.', pricePerUnit: 65000, unit: ProductUnit.KG, availableQuantity: 3000, minOrderQuantity: 10, farmingType: FarmingType.GLOBALGAP, status: ProductStatus.ACTIVE, viewCount: 2105, harvestDate: new Date('2026-05-20'), expiryDate: new Date('2026-11-20') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: TS, name: 'Mực khô Phú Quốc', description: 'Mực ống đánh bắt tự nhiên tại vùng biển Phú Quốc, phơi khô một nắng truyền thống. Mực to đều, màu hồng nhạt tự nhiên, không chất tẩy trắng.', pricePerUnit: 320000, unit: ProductUnit.KG, availableQuantity: 100, minOrderQuantity: 1, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 1678, harvestDate: new Date('2026-04-20'), expiryDate: new Date('2027-04-20') },

      // ── Gia vị ────────────────────────────────────────────────
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: GV, name: 'Tiêu đen Phú Quốc', description: 'Tiêu đen hạt to vùng Phú Quốc, được bảo hộ chỉ dẫn địa lý. Vị cay nồng đặc trưng, hương thơm mạnh. Hạt đều đẹp, không tạp chất. OCOP 5 sao.', pricePerUnit: 180000, unit: ProductUnit.KG, availableQuantity: 200, minOrderQuantity: 1, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 3210, harvestDate: new Date('2026-03-01'), expiryDate: new Date('2027-03-01') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: GV, name: 'Nghệ vàng hữu cơ Bình Định', description: 'Nghệ vàng hữu cơ trồng tại Bình Định, hàm lượng curcumin cao trên 5%. Sấy khô, xay mịn không pha trộn.', pricePerUnit: 95000, unit: ProductUnit.KG, availableQuantity: 300, minOrderQuantity: 1, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 2140, harvestDate: new Date('2026-02-15'), expiryDate: new Date('2027-02-15') },
      { sellerId: S, sellerType: SellerType.SUPPLIER, categoryId: GV, name: 'Tỏi đen Lý Sơn lên men tự nhiên', description: 'Tỏi đen lên men từ tỏi Lý Sơn nguyên củ. Vị ngọt nhẹ, không cay, thơm mùi balsamic. Giàu S-allyl cysteine gấp 10 lần tỏi tươi. Hộp 200g.', pricePerUnit: 350000, unit: ProductUnit.KG, availableQuantity: 50, minOrderQuantity: 1, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 4890, harvestDate: new Date('2026-05-01'), expiryDate: new Date('2026-11-01') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: GV, name: 'Gừng tươi hữu cơ Kỳ Sơn', description: 'Gừng tươi hữu cơ trồng trên núi Kỳ Sơn – Nghệ An 800m, củ già chắc, tinh dầu nhiều, vị cay nồng đậm đặc.', pricePerUnit: 45000, unit: ProductUnit.KG, availableQuantity: 400, minOrderQuantity: 5, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 1320, harvestDate: new Date('2026-04-20'), expiryDate: new Date('2026-07-20') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: GV, name: 'Tinh bột nghệ sạch Bình Định', description: 'Tinh bột nghệ hữu cơ 100% chiết xuất từ nghệ vàng tươi Bình Định. Màu vàng tươi đẹp, mịn mượt, curcumin nguyên vẹn.', pricePerUnit: 250000, unit: ProductUnit.KG, availableQuantity: 100, minOrderQuantity: 1, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 2890, harvestDate: new Date('2026-04-01'), expiryDate: new Date('2027-04-01') },

      // ── Mật ong & đặc sản ─────────────────────────────────────
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: MO, name: 'Mật ong hoa nhãn nguyên chất', description: 'Mật ong hoa nhãn từ đàn ong nuôi tại vườn nhãn Hưng Yên. Màu vàng amber, sánh đặc, vị ngọt thơm hoa nhãn.', pricePerUnit: 180000, unit: ProductUnit.LITER, availableQuantity: 200, minOrderQuantity: 1, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 2670, harvestDate: new Date('2026-07-01'), expiryDate: new Date('2027-07-01') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: MO, name: 'Mật ong rừng Tây Nguyên', description: 'Mật ong rừng nguyên khai thu từ tổ ong trên cây cổ thụ Tây Nguyên. Màu nâu đậm, vị đậm đà phức hợp nhiều loại hoa rừng.', pricePerUnit: 350000, unit: ProductUnit.LITER, availableQuantity: 80, minOrderQuantity: 1, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 5120, harvestDate: new Date('2026-03-15'), expiryDate: new Date('2027-03-15') },
      { sellerId: S, sellerType: SellerType.SUPPLIER, categoryId: MO, name: 'Muối hầm Cần Giờ', description: 'Muối hầm thủ công tại cánh đồng muối Cần Giờ TP.HCM. Muối trắng to hạt, độ mặn cao, giàu khoáng chất tự nhiên.', pricePerUnit: 8000, unit: ProductUnit.KG, availableQuantity: 10000, minOrderQuantity: 50, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 543, harvestDate: new Date('2026-04-01'), expiryDate: new Date('2028-04-01') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: MO, name: 'Dừa xiêm xanh Bến Tre', description: 'Dừa xiêm xanh Bến Tre, trái non 6–8 tháng, nước nhiều ngọt lạnh, cơm mỏng mềm. Thu hoạch tươi, giao trong 24h.', pricePerUnit: 15000, unit: ProductUnit.PIECE, availableQuantity: 5000, minOrderQuantity: 50, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 1234, harvestDate: new Date('2026-06-01'), expiryDate: new Date('2026-06-15') },
      { sellerId: S, sellerType: SellerType.SUPPLIER, categoryId: MO, name: 'Mắm nêm thùng Phan Thiết', description: 'Mắm nêm cá cơm ủ 12 tháng theo công thức truyền thống Phan Thiết. Màu nâu đỏ đẹp, mùi thơm đặc trưng.', pricePerUnit: 45000, unit: ProductUnit.LITER, availableQuantity: 300, minOrderQuantity: 2, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 1102, harvestDate: new Date('2026-01-01'), expiryDate: new Date('2026-07-01') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: MO, name: 'Nước mắm cốt nhĩ Phú Quốc 40 độ đạm', description: 'Nước mắm cốt nhĩ Phú Quốc chắt lọc đầu tiên, 40 độ đạm. Màu nâu cánh gián đẹp, mùi thơm dịu. Được bảo hộ GI EU.', pricePerUnit: 120000, unit: ProductUnit.LITER, availableQuantity: 500, minOrderQuantity: 2, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 4230, harvestDate: new Date('2026-01-01'), expiryDate: new Date('2027-01-01') },
      { sellerId: S, sellerType: SellerType.SUPPLIER, categoryId: MO, name: 'Dầu dừa nguyên chất ép lạnh', description: 'Dầu dừa VCO (virgin coconut oil) ép lạnh từ dừa tươi Bến Tre. Mùi dừa nhẹ, trong suốt, điểm nóng 175°C.', pricePerUnit: 180000, unit: ProductUnit.LITER, availableQuantity: 300, minOrderQuantity: 1, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 3870, harvestDate: new Date('2026-05-01'), expiryDate: new Date('2027-05-01') },
      { sellerId: S, sellerType: SellerType.SUPPLIER, categoryId: MO, name: 'Cao sâm Ngọc Linh cô đặc', description: 'Cao sâm Ngọc Linh chiết xuất cô đặc, nguồn sâm trồng tại vùng Ngọc Linh Quảng Nam 1500m. Hàm lượng ginsenoside MR2 cao.', pricePerUnit: 8500000, unit: ProductUnit.KG, availableQuantity: 5, minOrderQuantity: 1, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 9876, harvestDate: new Date('2026-02-01'), expiryDate: new Date('2028-02-01') },

      // ── Hạt & đậu ─────────────────────────────────────────────
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: HD, name: 'Hạt điều rang muối W320', description: 'Hạt điều rang muối W320 từ vùng điều Bình Phước, hạt to đều, không vỡ mảnh. Rang giòn, vị mặn nhẹ, thơm bơ tự nhiên.', pricePerUnit: 180000, unit: ProductUnit.KG, availableQuantity: 500, minOrderQuantity: 2, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 3456, harvestDate: new Date('2026-03-01'), expiryDate: new Date('2026-09-01') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: HD, name: 'Đậu phộng đỏ Bình Định', description: 'Đậu phộng đỏ (lạc đỏ) trồng tại Bình Định, hạt to đều, vỏ đỏ bóng đặc trưng. Hàm lượng dầu cao 45%.', pricePerUnit: 35000, unit: ProductUnit.KG, availableQuantity: 1200, minOrderQuantity: 10, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 867, harvestDate: new Date('2026-05-01'), expiryDate: new Date('2026-11-01') },

      // ── Nấm & rau sạch cao cấp ────────────────────────────────
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: RAU, name: 'Nấm linh chi đỏ hữu cơ', description: 'Nấm linh chi đỏ trồng trong nhà lưới tại Đà Lạt, bào tử nhiều. Thái lát sấy khô, hàm lượng polysaccharide cao.', pricePerUnit: 650000, unit: ProductUnit.KG, availableQuantity: 50, minOrderQuantity: 1, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 2234, harvestDate: new Date('2026-05-15'), expiryDate: new Date('2027-05-15') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: RAU, name: 'Nấm đông cô tươi Lâm Đồng', description: 'Nấm đông cô (shiitake) tươi trồng trên mùn cưa sồi tại Đà Lạt. Mũ nấm dày, nâu đậm, mùi thơm đặc trưng.', pricePerUnit: 80000, unit: ProductUnit.KG, availableQuantity: 200, minOrderQuantity: 2, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 1890, harvestDate: new Date('2026-06-01'), expiryDate: new Date('2026-06-08') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: RAU, name: 'Rau xà lách thủy canh Hà Nội', description: 'Xà lách romano thuỷ canh không đất tại Hà Nội. Lá xanh tươi giòn, không thuốc, không chì.', pricePerUnit: 42000, unit: ProductUnit.KG, availableQuantity: 100, minOrderQuantity: 1, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 678, harvestDate: new Date('2026-06-03'), expiryDate: new Date('2026-06-07') },

      // ── Trái cây phía Bắc ─────────────────────────────────────
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: TC, name: 'Đào tiên Mộc Châu', description: 'Đào tiên Mộc Châu – Sơn La, trái to tròn, vỏ vàng ửng đỏ, thịt vàng ngọt thơm. Trồng ở độ cao 1000m.', pricePerUnit: 60000, unit: ProductUnit.KG, availableQuantity: 350, minOrderQuantity: 5, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 1432, harvestDate: new Date('2026-07-10'), expiryDate: new Date('2026-07-20') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: TC, name: 'Mận hậu Bắc Hà Lào Cai', description: 'Mận hậu Bắc Hà chín muộn tháng 6–7, quả to đồng đều, vỏ tím mỡ màng, ruột vàng giòn ngọt.', pricePerUnit: 38000, unit: ProductUnit.KG, availableQuantity: 600, minOrderQuantity: 5, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 2100, harvestDate: new Date('2026-07-05'), expiryDate: new Date('2026-07-15') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: TC, name: 'Lê VH6 Bắc Giang', description: 'Lê VH6 lai tạo tại Bắc Giang, quả to hình quả lê cổ điển, vỏ vàng xanh, cùi giòn nhiều nước.', pricePerUnit: 48000, unit: ProductUnit.KG, availableQuantity: 400, minOrderQuantity: 5, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 543, harvestDate: new Date('2026-08-15'), expiryDate: new Date('2026-09-05') },

      // ── Hoa & cây cảnh ────────────────────────────────────────
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: HOA, name: 'Hoa cúc vàng Đà Lạt', description: 'Hoa cúc vàng tươi cắt cành từ trang trại Đà Lạt, mỗi bó 20 cành. Hoa nở đẹp, cánh dày, màu vàng tươi.', pricePerUnit: 45000, unit: ProductUnit.BUNCH, availableQuantity: 500, minOrderQuantity: 5, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 1120, harvestDate: new Date('2026-06-05'), expiryDate: new Date('2026-06-12') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: HOA, name: 'Hoa hồng nhập khẩu Ecuador', description: 'Hoa hồng Ecuador thân dài 60–70cm, bông to đẹp 5–6cm, màu sắc đa dạng. Trồng trên cao nguyên 3000m.', pricePerUnit: 85000, unit: ProductUnit.BUNCH, availableQuantity: 200, minOrderQuantity: 2, farmingType: FarmingType.GLOBALGAP, status: ProductStatus.ACTIVE, viewCount: 2340, harvestDate: new Date('2026-06-07'), expiryDate: new Date('2026-06-21') },

      // ── Gia súc & gia cầm ─────────────────────────────────────
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: GS, name: 'Trứng gà ta thả vườn Đồng Nai', description: 'Trứng gà ta thả vườn nuôi bằng thức ăn ngũ cốc tự nhiên tại Đồng Nai. Vỏ nâu sần, lòng đỏ đậm màu cam.', pricePerUnit: 65000, unit: ProductUnit.BOX, availableQuantity: 1000, minOrderQuantity: 5, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 3456, harvestDate: new Date('2026-06-04'), expiryDate: new Date('2026-07-04') },
      { sellerId: C, sellerType: SellerType.COOPERATIVE, categoryId: GS, name: 'Thịt bò Wagyu F1 Lâm Đồng', description: 'Thịt bò Wagyu F1 nuôi tại trang trại Lâm Đồng, vân mỡ đẹp (marbling score 4–6). Cỏ tươi kết hợp ngũ cốc.', pricePerUnit: 650000, unit: ProductUnit.KG, availableQuantity: 100, minOrderQuantity: 1, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 5670, harvestDate: new Date('2026-06-01'), expiryDate: new Date('2026-06-15') },
      { sellerId: F, sellerType: SellerType.FARMER, categoryId: GS, name: 'Sữa bò tươi nguyên liệu Mộc Châu', description: 'Sữa bò tươi nguyên liệu từ trang trại bò sữa Mộc Châu, độ béo 3.6%, protein 3.2%. Thanh trùng nhiệt độ thấp.', pricePerUnit: 22000, unit: ProductUnit.LITER, availableQuantity: 500, minOrderQuantity: 5, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 1890, harvestDate: new Date('2026-06-04'), expiryDate: new Date('2026-06-11') },
    ];

    const saved = await this.productSeedRepository.saveSeedProducts(mockProducts);

    const FALLBACK = 'https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&q=80';
    await this.productSeedRepository.savePrimaryImagesForProducts(saved, FALLBACK);

    return { seeded: saved.length, skipped: 0 };
  }
}
