import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Product } from '../domain/entities/product.entity';
import { ProductCategory } from '../domain/entities/product-category.entity';
import { ProductImage } from '../domain/entities/product-image.entity';
import { ProductCertification } from '../domain/entities/product-certification.entity';
import { CreateProductDto } from '../presentation/schemas/create-product.dto';
import { UpdateProductDto } from '../presentation/schemas/update-product.dto';
import {
  CreateProductCertificationDto,
  VerifyProductCertificationDto,
} from '../presentation/schemas/product-certification.dto';
import { ProductFilterDto } from '../presentation/schemas/product-filter.dto';
import { WishlistQueryDto } from '../presentation/schemas/wishlist-query.dto';
import { Wishlist } from '../domain/entities/wishlist.entity';
import { NotificationsService } from '@modules/notifications/notifications.service';
import {
  ProductDetailCategory,
  ProductDetailLocation,
  ProductDetailResponse,
  ProductDetailSeller,
} from '../presentation/schemas/product-detail.response';
import {
  CertificationStatus,
  NotifType,
  ProductStatus,
  SellerType,
  UserRole,
} from '@common/enums';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,

    @InjectRepository(ProductCertification)
    private readonly certRepo: Repository<ProductCertification>,

    @InjectRepository(ProductCategory)
    private readonly categoryRepo: Repository<ProductCategory>,

    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,

    private readonly notificationsService: NotificationsService,

    private readonly dataSource: DataSource,
  ) { }

  // ─── Categories ───────────────────────────────────────────────

  /** Root categories only (parentId null) — used by `GET /products/categories`. */
  async findCategories(): Promise<ProductCategory[]> {
    return this.categoryRepo.find({
      where: { parentId: null as unknown as string, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /** Full 2-level tree (roots + nested children) — used by search filter. */
  async getCategoryTree(): Promise<ProductCategory[]> {
    const all = await this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    const byParent = new Map<string | null, ProductCategory[]>();
    for (const c of all) {
      const key = c.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(c);
    }

    const roots = byParent.get(null) ?? [];
    for (const r of roots) {
      (r as ProductCategory & { children: ProductCategory[] }).children =
        byParent.get(r.id) ?? [];
    }
    return roots;
  }

  async seedCategories(): Promise<void> {
    const count = await this.categoryRepo.count();
    if (count > 0) return;
    const roots = await this.categoryRepo.save([
      this.categoryRepo.create({ name: 'Rau củ quả', slug: 'rau-cu-qua', sortOrder: 1 }),
      this.categoryRepo.create({ name: 'Trái cây', slug: 'trai-cay', sortOrder: 2 }),
      this.categoryRepo.create({ name: 'Lúa gạo & Ngũ cốc', slug: 'lua-gao-ngu-coc', sortOrder: 3 }),
      this.categoryRepo.create({ name: 'Thủy sản', slug: 'thuy-san', sortOrder: 4 }),
      this.categoryRepo.create({ name: 'Gia súc & Gia cầm', slug: 'gia-suc-gia-cam', sortOrder: 5 }),
      this.categoryRepo.create({ name: 'Cà phê & Chè', slug: 'ca-phe-che', sortOrder: 6 }),
      this.categoryRepo.create({ name: 'Gia vị & Thảo mộc', slug: 'gia-vi-thao-moc', sortOrder: 7 }),
      this.categoryRepo.create({ name: 'Hạt & Đậu', slug: 'hat-dau', sortOrder: 8 }),
      this.categoryRepo.create({ name: 'Mật ong & Đặc sản', slug: 'mat-ong-dac-san', sortOrder: 9 }),
      this.categoryRepo.create({ name: 'Hoa & Cây cảnh', slug: 'hoa-cay-canh', sortOrder: 10 }),
    ]);
    console.log(`[Seed] Inserted ${roots.length} product categories`);
  }

  // ─── Create ──────────────────────────────────────────────────

  async create(
    sellerId: string,
    sellerType: SellerType,
    dto: CreateProductDto,
  ): Promise<Product> {
    const { images = [], certifications = [], sellerType: _sellerType, ...productData } = dto;

    return this.dataSource.transaction(async (manager) => {
      const product = manager.create(Product, {
        ...productData,
        sellerId,
        sellerType,
        status: ProductStatus.DRAFT,
      });
      const savedProduct = await manager.save(Product, product);

      if (images.length > 0) {
        const hasPrimary = images.some((img) => img.isPrimary);
        await manager.save(
          ProductImage,
          images.map((img, index) =>
            manager.create(ProductImage, {
              productId: savedProduct.id,
              imageUrl: img.imageUrl,
              isPrimary: hasPrimary ? !!img.isPrimary : index === 0,
              sortOrder: img.sortOrder ?? index,
            }),
          ),
        );
      }

      if (certifications.length > 0) {
        await manager.save(
          ProductCertification,
          certifications.map((cert) =>
            manager.create(ProductCertification, {
              productId: savedProduct.id,
              certType: cert.certType,
              certNumber: cert.certNumber ?? null,
              issuedBy: cert.issuedBy ?? null,
              issuedDate: cert.issuedDate as any,
              expiryDate: cert.expiryDate as any,
              documentUrl: cert.documentUrl ?? null,
              isVerified: false,
              status: CertificationStatus.PENDING,
            }),
          ),
        );
      }

      return manager.findOneOrFail(Product, {
        where: { id: savedProduct.id },
        relations: ['category', 'category.parent', 'images', 'certifications'],
      });
    });
  }

  // ─── Find All + Filter ────────────────────────────────────────

  async findAll(
    filter: ProductFilterDto,
    currentUserId?: string,
  ): Promise<{ data: Product[]; total: number }> {
    const { page = 1, limit = 20, search, categoryId, provinceId,
      farmingType, status, minPrice, maxPrice, sellerId, isFeatured,
      sortBy = 'createdAt', order = 'DESC' } = filter;

    const SORT_COLUMN_MAP: Record<string, string> = {
      createdAt: 'p.createdAt',
      pricePerUnit: 'p.pricePerUnit',
      name: 'p.name',
      soldCount: 'p.soldCount',
      avgRating: 'p.avgRating',
    };

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images', 'images.isPrimary = true')
      .orderBy(SORT_COLUMN_MAP[sortBy], order)
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere(
        'p.name ILIKE :search OR p.description ILIKE :search',
        { search: `%${search}%` },
      );
    }

    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (provinceId) qb.andWhere('p.provinceId = :provinceId', { provinceId });
    if (farmingType) qb.andWhere('p.farmingType = :farmingType', { farmingType });
    if (isFeatured !== undefined) qb.andWhere('p.isFeatured = :isFeatured', { isFeatured });

    if (sellerId && sellerId === currentUserId) {
      qb.andWhere('p.sellerId = :sellerId', { sellerId });
      if (status) qb.andWhere('p.status = :status', { status });
    } else if (sellerId) {
      qb.andWhere('p.sellerId = :sellerId', { sellerId });
      qb.andWhere('p.status = :status', { status: ProductStatus.ACTIVE });
    } else {
      qb.andWhere('p.status = :status', { status: ProductStatus.ACTIVE });
    }
    if (minPrice !== undefined) qb.andWhere('p.pricePerUnit >= :minPrice', { minPrice });
    if (maxPrice !== undefined) qb.andWhere('p.pricePerUnit <= :maxPrice', { maxPrice });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  // ─── Find One ─────────────────────────────────────────────────

  /** Internal lookup — entity only, used by update/remove/etc. */
  private async findEntityOrFail(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'category.parent', 'images', 'certifications'],
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }

  /**
   * GET /products/:id — full detail with seller info populated via raw queries
   * (avoids cross-module entity coupling with P1's auth/profiles).
   */
  async findOne(id: string): Promise<ProductDetailResponse> {
    const product = await this.findEntityOrFail(id);

    // Fire-and-forget view counter (don't block response)
    void this.productRepo.increment({ id }, 'viewCount', 1).catch(() => undefined);

    const [seller, province, district] = await Promise.all([
      this.populateSeller(product.sellerId, product.sellerType),
      this.findLocation('provinces', product.provinceId),
      this.findLocation('districts', product.districtId),
    ]);

    return this.toDetailResponse(product, seller, province, district);
  }

  // ─── Populate helpers ─────────────────────────────────────────

  private async populateSeller(
    sellerId: string,
    sellerType: SellerType,
  ): Promise<ProductDetailSeller | null> {
    const userRows = await this.dataSource.query(
      `SELECT id, full_name AS "fullName", phone, avatar_url AS "avatarUrl"
       FROM users WHERE id = $1 LIMIT 1`,
      [sellerId],
    );
    const user = userRows[0];
    if (!user) return null;

    const seller: ProductDetailSeller = {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      sellerType,
    };

    let profileProvinceId: string | null = null;

    if (sellerType === SellerType.FARMER) {
      const rows = await this.dataSource.query(
        `SELECT bio, farm_name AS "farmName", experience_years AS "experienceYears",
                province_id AS "provinceId"
         FROM farmer_profiles WHERE user_id = $1 LIMIT 1`,
        [sellerId],
      );
      if (rows[0]) {
        seller.bio = rows[0].bio ?? null;
        seller.farmName = rows[0].farmName ?? null;
        seller.experienceYears = rows[0].experienceYears ?? null;
        profileProvinceId = rows[0].provinceId ?? null;
      }
    } else if (sellerType === SellerType.COOPERATIVE) {
      const rows = await this.dataSource.query(
        `SELECT cooperative_name AS "cooperativeName", member_count AS "memberCount",
                province_id AS "provinceId"
         FROM cooperative_profiles WHERE user_id = $1 LIMIT 1`,
        [sellerId],
      );
      if (rows[0]) {
        seller.cooperativeName = rows[0].cooperativeName;
        seller.memberCount = rows[0].memberCount ?? 0;
        profileProvinceId = rows[0].provinceId ?? null;
      }
    } else if (sellerType === SellerType.SUPPLIER) {
      const rows = await this.dataSource.query(
        `SELECT company_name AS "companyName", supplier_type AS "supplierType",
                province_id AS "provinceId"
         FROM supplier_profiles WHERE user_id = $1 LIMIT 1`,
        [sellerId],
      );
      if (rows[0]) {
        seller.companyName = rows[0].companyName;
        seller.supplierType = rows[0].supplierType ?? null;
        profileProvinceId = rows[0].provinceId ?? null;
      }
    }

    if (profileProvinceId) {
      seller.province = await this.findLocation('provinces', profileProvinceId);
    }

    return seller;
  }

  private async findLocation(
    table: 'provinces' | 'districts',
    id: string | null | undefined,
  ): Promise<ProductDetailLocation | null> {
    if (!id) return null;
    const cols =
      table === 'provinces'
        ? 'id, name, code, region'
        : 'id, name, code';
    const rows = await this.dataSource.query(
      `SELECT ${cols} FROM ${table} WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      code: row.code ?? null,
      region: row.region ?? null,
    };
  }

  private toDetailResponse(
    p: Product,
    seller: ProductDetailSeller | null,
    province: ProductDetailLocation | null,
    district: ProductDetailLocation | null,
  ): ProductDetailResponse {
    const toIsoDate = (d: Date | string | null | undefined): string | null => {
      if (!d) return null;
      return typeof d === 'string' ? d : d.toISOString();
    };

    const category: ProductDetailCategory | null = p.category
      ? {
          id: p.category.id,
          name: p.category.name,
          slug: p.category.slug,
          iconUrl: p.category.iconUrl ?? null,
          description: p.category.description ?? null,
          parent: p.category.parent
            ? {
                id: p.category.parent.id,
                name: p.category.parent.name,
                slug: p.category.parent.slug,
              }
            : null,
        }
      : null;

    const images = (p.images ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        altText: img.altText ?? null,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      }));

    const certifications = (p.certifications ?? []).map((c) => ({
      id: c.id,
      certType: c.certType,
      certNumber: c.certNumber ?? null,
      issuedBy: c.issuedBy ?? null,
      issuedDate: toIsoDate(c.issuedDate),
      expiryDate: toIsoDate(c.expiryDate),
      documentUrl: c.documentUrl ?? null,
      isVerified: c.isVerified,
      status: c.status,
      verifiedBy: c.verifiedBy ?? null,
      verifiedAt: toIsoDate(c.verifiedAt),
      rejectionReason: c.rejectionReason ?? null,
    }));

    return {
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      sku: p.sku ?? null,
      variety: p.variety ?? null,
      pricePerUnit: Number(p.pricePerUnit),
      unit: p.unit,
      availableQuantity: Number(p.availableQuantity),
      minOrderQuantity: p.minOrderQuantity != null ? Number(p.minOrderQuantity) : null,
      farmingType: p.farmingType ?? null,
      status: p.status,
      harvestDate: toIsoDate(p.harvestDate),
      expiryDate: toIsoDate(p.expiryDate),
      rejectionReason: p.rejectionReason ?? null,
      isFeatured: p.isFeatured,
      viewCount: p.viewCount,
      soldCount: Number(p.soldCount ?? 0),
      avgRating: Number(p.avgRating ?? 0),
      farmLatitude: p.farmLatitude ?? null,
      farmLongitude: p.farmLongitude ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),

      province,
      district,
      category,
      images,
      certifications,
      seller,
    };
  }

  // ─── Update ───────────────────────────────────────────────────

  async update(id: string, sellerId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findEntityOrFail(id);
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa sản phẩm này');
    }
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async updateStatus(
    id: string,
    actorId: string,
    actorRole: UserRole,
    nextStatus: ProductStatus,
  ): Promise<Product> {
    const product = await this.findEntityOrFail(id);
    const previousStatus = product.status;
    const isOwner = product.sellerId === actorId;
    const isReviewer = [UserRole.ADMIN, UserRole.STATE_AGENCY].includes(actorRole);

    if (!isOwner && !isReviewer) {
      throw new ForbiddenException('Bạn không có quyền đổi trạng thái sản phẩm này');
    }

    if (previousStatus === nextStatus) {
      return product;
    }

    if (!this.getAllowedStatusTargets(previousStatus).includes(nextStatus)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái sản phẩm từ ${previousStatus} sang ${nextStatus}`,
      );
    }

    this.assertStatusPermission(previousStatus, nextStatus, isOwner, isReviewer);

    if (nextStatus === ProductStatus.ACTIVE && Number(product.availableQuantity) <= 0) {
      throw new BadRequestException('Sản phẩm phải có số lượng tồn kho lớn hơn 0 để kích hoạt');
    }

    product.status = nextStatus;
    product.rejectionReason = null;

    const saved = await this.productRepo.save(product);
    await this.notifySellerStatusChanged(saved, previousStatus);

    return saved;
  }

  private getAllowedStatusTargets(currentStatus: ProductStatus): ProductStatus[] {
    const flow: Partial<Record<ProductStatus, ProductStatus[]>> = {
      [ProductStatus.DRAFT]: [ProductStatus.PENDING_APPROVAL],
      [ProductStatus.REJECTED]: [ProductStatus.PENDING_APPROVAL],
      [ProductStatus.PENDING_APPROVAL]: [ProductStatus.ACTIVE],
      [ProductStatus.ACTIVE]: [ProductStatus.OUT_OF_STOCK],
      [ProductStatus.OUT_OF_STOCK]: [ProductStatus.ACTIVE],
    };

    return flow[currentStatus] ?? [];
  }

  private assertStatusPermission(
    currentStatus: ProductStatus,
    nextStatus: ProductStatus,
    isOwner: boolean,
    isReviewer: boolean,
  ) {
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

  private async notifySellerStatusChanged(
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

    const type =
      product.status === ProductStatus.ACTIVE
        ? NotifType.PRODUCT_APPROVED
        : NotifType.PRODUCT_STATUS_CHANGED;

    await this.notificationsService.create({
      userId: product.sellerId,
      type,
      title: titleByStatus[product.status],
      body: `Sản phẩm "${product.name}" đã chuyển từ ${previousStatus} sang ${product.status}.`,
      data: {
        productId: product.id,
        previousStatus,
        status: product.status,
      },
    });
  }

  // ─── Remove ───────────────────────────────────────────────────

  async remove(id: string, sellerId: string): Promise<void> {
    const product = await this.findEntityOrFail(id);
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền xóa sản phẩm này');
    }
    product.status = ProductStatus.DRAFT;
    await this.productRepo.save(product);
  }

  // ─── Images ───────────────────────────────────────────────────

  async addImage(
    productId: string,
    imageUrl: string,
    isPrimary: boolean,
  ): Promise<ProductImage> {
    if (isPrimary) {
      await this.imageRepo.update({ productId }, { isPrimary: false });
    }
    const count = await this.imageRepo.count({ where: { productId } });
    const image = this.imageRepo.create({
      productId,
      imageUrl,
      isPrimary,
      sortOrder: count,
    });
    return this.imageRepo.save(image);
  }

  async removeImage(productId: string, imageId: string): Promise<void> {
    const image = await this.imageRepo.findOne({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Không tìm thấy ảnh');
    await this.imageRepo.remove(image);
  }

  // ─── Certifications ───────────────────────────────────────────

  async addCertification(
    productId: string,
    sellerId: string,
    dto: CreateProductCertificationDto,
  ): Promise<ProductCertification> {
    const product = await this.findEntityOrFail(productId);
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền thêm chứng nhận cho sản phẩm này');
    }

    const cert = this.certRepo.create({
      ...dto,
      productId,
      issuedDate: dto.issuedDate as any,
      expiryDate: dto.expiryDate as any,
      isVerified: false,
      status: CertificationStatus.PENDING,
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
    });
    return this.certRepo.save(cert);
  }

  async findPendingCertifications(): Promise<ProductCertification[]> {
    return this.certRepo.find({
      where: { status: CertificationStatus.PENDING },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async verifyCertification(
    certId: string,
    adminId: string,
    dto: VerifyProductCertificationDto,
  ): Promise<ProductCertification> {
    const cert = await this.certRepo.findOne({
      where: { id: certId },
      relations: ['product'],
    });
    if (!cert) throw new NotFoundException('Không tìm thấy chứng nhận');

    if (dto.status === CertificationStatus.PENDING) {
      throw new BadRequestException('Trạng thái duyệt phải là verified hoặc rejected');
    }

    if (
      dto.status === CertificationStatus.REJECTED &&
      !dto.rejectionReason?.trim()
    ) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối chứng nhận');
    }

    cert.status = dto.status;
    cert.isVerified = dto.status === CertificationStatus.VERIFIED;
    cert.verifiedBy = adminId;
    cert.verifiedAt = new Date();
    cert.rejectionReason =
      dto.status === CertificationStatus.REJECTED
        ? dto.rejectionReason.trim()
        : null;

    return this.certRepo.save(cert);
  }

  async removeCertification(productId: string, certId: string, sellerId: string): Promise<void> {
    const product = await this.findEntityOrFail(productId);
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền xóa chứng nhận của sản phẩm này');
    }

    const cert = await this.certRepo.findOne({
      where: { id: certId, productId },
    });
    if (!cert) throw new NotFoundException('Không tìm thấy chứng nhận');
    await this.certRepo.remove(cert);
  }

  // ─── Wishlist ─────────────────────────────────────────────────

  async addToWishlist(userId: string, productId: string): Promise<Wishlist> {
    const product = await this.productRepo.findOne({
      where: { id: productId, status: ProductStatus.ACTIVE },
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm hoạt động');
    }

    const existing = await this.wishlistRepo.findOne({
      where: { userId, productId },
    });
    if (existing) {
      return existing;
    }

    const entry = this.wishlistRepo.create({ userId, productId });
    return this.wishlistRepo.save(entry);
  }

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    await this.wishlistRepo.delete({ userId, productId });
  }

  async getWishlist(
    userId: string,
    query: WishlistQueryDto,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const qb = this.wishlistRepo
      .createQueryBuilder('w')
      .innerJoinAndSelect('w.product', 'p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images', 'images.isPrimary = true')
      .where('w.userId = :userId', { userId })
      .andWhere('p.status = :status', { status: ProductStatus.ACTIVE })
      .orderBy('w.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    const data = items.map((item) => item.product);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getWishlistedIds(userId: string): Promise<string[]> {
    const items = await this.wishlistRepo.find({
      where: { userId },
      select: ['productId'],
    });
    return items.map((item) => item.productId);
  }

  // ─── Dev seed ─────────────────────────────────────────────────

  async resetAndSeed(): Promise<{ deleted: number; seeded: number }> {
    const deleted = await this.productRepo.count();
    await this.certRepo.clear();
    await this.imageRepo.clear();
    await this.productRepo.query('TRUNCATE TABLE products CASCADE');
    const result = await this.seedMockData();
    return { deleted, seeded: result.seeded };
  }

  async seedMockData(): Promise<{ seeded: number; skipped: number }> {
    const existing = await this.productRepo.count();
    if (existing > 0) return { seeded: 0, skipped: existing };

    const F = '00000000-0000-0000-0000-000000000001'; // farmer
    const C = '00000000-0000-0000-0000-000000000002'; // cooperative
    const S = '00000000-0000-0000-0000-000000000003'; // supplier

    const cats = await this.categoryRepo.find();
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

    type P = Parameters<typeof this.productRepo.create>[0];

    const mockProducts: P[] = [
      // ── Trái cây ──────────────────────────────────────────────
      { sellerId: F, sellerType: 'farmer' as any, categoryId: TC, name: 'Xoài cát Hòa Lộc loại 1', description: 'Xoài cát Hòa Lộc chính gốc Tiền Giang, trái to đều, vỏ vàng óng, thịt dày ngọt thơm, ít xơ. Canh tác theo tiêu chuẩn VietGAP, không sử dụng chất kích thích tăng trưởng.', pricePerUnit: 45000, unit: 'kg' as any, availableQuantity: 500, minOrderQuantity: 10, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 1284, harvestDate: '2026-06-15' as any, expiryDate: '2026-06-22' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: TC, name: 'Thanh long ruột đỏ xuất khẩu', description: 'Thanh long ruột đỏ Bình Thuận đạt chuẩn GlobalGAP, đủ điều kiện xuất khẩu sang EU và Nhật Bản. Trái đều, màu đỏ đậm, vị ngọt thanh.', pricePerUnit: 35000, unit: 'kg' as any, availableQuantity: 1000, minOrderQuantity: 50, farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 2105, harvestDate: '2026-06-20' as any, expiryDate: '2026-06-27' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: TC, name: 'Sầu riêng Ri6 Cai Lậy', description: 'Sầu riêng Ri6 vùng Cai Lậy – Tiền Giang, cơm vàng hạt lép, mùi thơm nồng đặc trưng. Thu hoạch đúng độ chín, không dùng chất thúc chín.', pricePerUnit: 85000, unit: 'kg' as any, availableQuantity: 600, minOrderQuantity: 5, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 3250, harvestDate: '2026-07-15' as any, expiryDate: '2026-07-22' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: TC, name: 'Bưởi da xanh Bến Tre', description: 'Bưởi da xanh đặc sản Bến Tre, vỏ xanh bóng, múi to, tép mọng nước, vị ngọt ít đắng. Đạt VietGAP, trái đồng đều từ 1.2–1.8kg/trái.', pricePerUnit: 32000, unit: 'kg' as any, availableQuantity: 800, minOrderQuantity: 10, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 1120, harvestDate: '2026-07-01' as any, expiryDate: '2026-07-20' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: TC, name: 'Dưa hấu không hạt Long An', description: 'Dưa hấu không hạt trồng tại Long An, vỏ mỏng, ruột đỏ tươi, ngọt sắc. Trọng lượng 3–6kg/quả. Thích hợp dùng ngay hoặc làm nước ép.', pricePerUnit: 18000, unit: 'kg' as any, availableQuantity: 3000, minOrderQuantity: 30, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 987, harvestDate: '2026-06-10' as any, expiryDate: '2026-06-20' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: TC, name: 'Nhãn lồng Hưng Yên', description: 'Nhãn lồng chính gốc Hưng Yên, cùi dày, hạt nhỏ, vị ngọt đậm thơm. Mùa vụ tháng 7–8, thu hái khi trái chín đều. Không ướp hóa chất bảo quản.', pricePerUnit: 55000, unit: 'kg' as any, availableQuantity: 400, minOrderQuantity: 5, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1890, harvestDate: '2026-07-20' as any, expiryDate: '2026-07-30' as any },
      { sellerId: S, sellerType: 'supplier' as any, categoryId: TC, name: 'Vải thiều Lục Ngạn Bắc Giang', description: 'Vải thiều Lục Ngạn được cấp chỉ dẫn địa lý, xuất khẩu sang 30 quốc gia. Vỏ đỏ tươi, hạt nhỏ, cùi giòn ngọt. Đạt GlobalGAP và OCOP 4 sao.', pricePerUnit: 42000, unit: 'kg' as any, availableQuantity: 1500, minOrderQuantity: 20, farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 4120, harvestDate: '2026-06-05' as any, expiryDate: '2026-06-15' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: TC, name: 'Cam sành Hà Giang', description: 'Cam sành vùng cao Hà Giang, vỏ sần xù đặc trưng, ruột vàng cam đẹp, vị chua ngọt hài hòa, nhiều vitamin C. Không dùng thuốc kích màu.', pricePerUnit: 38000, unit: 'kg' as any, availableQuantity: 700, minOrderQuantity: 10, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 654, harvestDate: '2026-01-15' as any, expiryDate: '2026-02-28' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: TC, name: 'Dứa MD2 Ninh Bình', description: 'Dứa MD2 (dứa vàng) nhập giống từ Hawaii, trồng tại Ninh Bình. Ruột vàng, ít xơ, độ Brix 15–17, ngọt hơn dứa Queen thông thường 30%.', pricePerUnit: 28000, unit: 'kg' as any, availableQuantity: 900, minOrderQuantity: 15, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 776, harvestDate: '2026-05-10' as any, expiryDate: '2026-05-25' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: TC, name: 'Ổi lê Đài Loan không hạt', description: 'Ổi lê không hạt trồng theo quy trình VietGAP tại Bình Dương. Trái to tròn, vỏ xanh mướt, ruột trắng giòn ngọt nhẹ. Thích hợp làm quà biếu.', pricePerUnit: 35000, unit: 'kg' as any, availableQuantity: 300, minOrderQuantity: 5, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 512, harvestDate: '2026-05-20' as any, expiryDate: '2026-05-30' as any },

      // ── Rau củ ────────────────────────────────────────────────
      { sellerId: F, sellerType: 'farmer' as any, categoryId: RAU, name: 'Rau muống hữu cơ Đà Lạt', description: 'Rau muống trồng theo hướng hữu cơ tại Đà Lạt, không thuốc trừ sâu, tươi ngon mỗi ngày. Phù hợp bếp ăn gia đình và nhà hàng.', pricePerUnit: 25000, unit: 'kg' as any, availableQuantity: 200, minOrderQuantity: 5, farmingType: 'organic' as any, status: 'active' as any, viewCount: 892, harvestDate: '2026-06-01' as any, expiryDate: '2026-06-05' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: RAU, name: 'Rau cải bắp VietGAP Lâm Đồng', description: 'Bắp cải trắng trồng tại cao nguyên Lâm Đồng 900m, khí hậu mát mẻ giúp cải giòn chắc, lá xanh đậm. Đạt chứng nhận VietGAP, cung cấp siêu thị.', pricePerUnit: 12000, unit: 'kg' as any, availableQuantity: 2000, minOrderQuantity: 50, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 445, harvestDate: '2026-05-28' as any, expiryDate: '2026-06-05' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: RAU, name: 'Cà chua bi hữu cơ Đà Lạt', description: 'Cà chua bi hữu cơ 100% Đà Lạt, trồng trong nhà kính. Trái nhỏ đỏ đều, vị chua ngọt đậm, giàu lycopene. Không thuốc trừ sâu, phân hóa học.', pricePerUnit: 48000, unit: 'kg' as any, availableQuantity: 150, minOrderQuantity: 3, farmingType: 'organic' as any, status: 'active' as any, viewCount: 1230, harvestDate: '2026-06-03' as any, expiryDate: '2026-06-10' as any },
      { sellerId: S, sellerType: 'supplier' as any, categoryId: RAU, name: 'Khoai lang tím Nhật Vĩnh Long', description: 'Khoai lang tím giống Nhật trồng tại Vĩnh Long, củ đều đẹp, ruột tím đậm, hàm lượng anthocyanin cao. Xuất khẩu sang Nhật và Hàn Quốc.', pricePerUnit: 22000, unit: 'kg' as any, availableQuantity: 3000, minOrderQuantity: 100, farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 2340, harvestDate: '2026-05-15' as any, expiryDate: '2026-08-15' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: RAU, name: 'Bí đỏ Hokaido Gia Lai', description: 'Bí đỏ Hokaido (bí hồ lô Nhật) trồng tại Gia Lai, trọng lượng 1–2kg/quả, ruột vàng đặc, vị ngọt bùi. Tốt cho bé ăn dặm và người ăn kiêng.', pricePerUnit: 30000, unit: 'kg' as any, availableQuantity: 500, minOrderQuantity: 10, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 388, harvestDate: '2026-06-12' as any, expiryDate: '2026-09-12' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: RAU, name: 'Hành tím Vĩnh Châu Sóc Trăng', description: 'Hành tím Vĩnh Châu nổi tiếng cả nước, củ nhỏ chắc, màu tím đặc trưng, mùi hăng nồng. Phơi khô tự nhiên, bảo quản được 6 tháng. Đạt OCOP 3 sao.', pricePerUnit: 28000, unit: 'kg' as any, availableQuantity: 5000, minOrderQuantity: 50, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1540, harvestDate: '2026-04-10' as any, expiryDate: '2026-10-10' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: RAU, name: 'Măng tây xanh Ninh Thuận', description: 'Măng tây xanh trồng tại Ninh Thuận, đất pha cát thổ nhưỡng đặc biệt. Chồi non mập mạp, giòn ngọt, giàu axit folic và vitamin K. Hái tươi hàng ngày.', pricePerUnit: 65000, unit: 'kg' as any, availableQuantity: 120, minOrderQuantity: 2, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 921, harvestDate: '2026-06-02' as any, expiryDate: '2026-06-05' as any },

      // ── Gạo ───────────────────────────────────────────────────
      { sellerId: F, sellerType: 'farmer' as any, categoryId: GAO, name: 'Gạo ST25 đặc sản Sóc Trăng', description: 'Gạo ST25 do ông Hồ Quang Cua lai tạo, từng đạt giải gạo ngon nhất thế giới. Hạt dài, cơm thơm dẻo, vị ngọt tự nhiên.', pricePerUnit: 28000, unit: 'kg' as any, availableQuantity: 2000, minOrderQuantity: 20, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 5432, harvestDate: '2026-05-30' as any, expiryDate: '2027-05-30' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: GAO, name: 'Gạo hữu cơ Séng Cù Mường Khương', description: 'Gạo Séng Cù hữu cơ vùng núi Mường Khương – Lào Cai 1200m. Hạt mập, cơm dẻo thơm mùi lá dứa tự nhiên. Được Nhật Bản cấp chứng nhận hữu cơ JAS.', pricePerUnit: 52000, unit: 'kg' as any, availableQuantity: 800, minOrderQuantity: 5, farmingType: 'organic' as any, status: 'active' as any, viewCount: 2180, harvestDate: '2025-11-20' as any, expiryDate: '2026-11-20' as any },
      { sellerId: S, sellerType: 'supplier' as any, categoryId: GAO, name: 'Nếp cái hoa vàng Hải Dương', description: 'Nếp cái hoa vàng đặc sản đồng bằng sông Hồng, hạt trắng trong, dẻo thơm đặc biệt. Dùng làm xôi, bánh chưng, rượu nếp truyền thống.', pricePerUnit: 35000, unit: 'kg' as any, availableQuantity: 1500, minOrderQuantity: 20, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 873, harvestDate: '2025-12-01' as any, expiryDate: '2026-12-01' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: GAO, name: 'Gạo lứt đỏ hữu cơ An Giang', description: 'Gạo lứt đỏ hữu cơ An Giang, còn nguyên cám đỏ giàu chất xơ và vitamin B. Phù hợp người ăn kiêng, tiểu đường, muốn kiểm soát cân nặng.', pricePerUnit: 32000, unit: 'kg' as any, availableQuantity: 600, minOrderQuantity: 5, farmingType: 'organic' as any, status: 'active' as any, viewCount: 1450, harvestDate: '2026-04-15' as any, expiryDate: '2027-04-15' as any },

      // ── Cà phê & chè ──────────────────────────────────────────
      { sellerId: F, sellerType: 'farmer' as any, categoryId: CF, name: 'Cà phê Arabica Cầu Đất Đà Lạt', description: 'Cà phê Arabica trồng tại vùng Cầu Đất 1500m so mực nước biển. Hữu cơ 100%, rang mộc theo phương pháp truyền thống.', pricePerUnit: 120000, unit: 'kg' as any, availableQuantity: 150, minOrderQuantity: 2, farmingType: 'organic' as any, status: 'active' as any, viewCount: 764, harvestDate: '2025-12-01' as any, expiryDate: '2026-12-01' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: CF, name: 'Cà phê Robusta Buôn Ma Thuột', description: 'Cà phê Robusta nguyên bản từ Buôn Ma Thuột – thủ phủ cà phê Tây Nguyên. Hạt to đều, rang đậm, vị đắng mạnh, hậu vị ngọt lâu. Chứng nhận UTZ.', pricePerUnit: 75000, unit: 'kg' as any, availableQuantity: 500, minOrderQuantity: 5, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 2890, harvestDate: '2025-12-15' as any, expiryDate: '2026-12-15' as any },
      { sellerId: S, sellerType: 'supplier' as any, categoryId: CF, name: 'Chè Shan Tuyết Hà Giang', description: 'Chè Shan Tuyết cổ thụ trên đỉnh núi Hà Giang 1500m. Búp trắng phủ tuyết, vị ngọt hậu dài, thơm mát. Hữu cơ tự nhiên, không phân bón hóa học.', pricePerUnit: 280000, unit: 'kg' as any, availableQuantity: 80, minOrderQuantity: 1, farmingType: 'organic' as any, status: 'active' as any, viewCount: 3420, harvestDate: '2026-04-01' as any, expiryDate: '2027-04-01' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: CF, name: 'Chè xanh Thái Nguyên loại đặc', description: 'Chè xanh Tân Cương – Thái Nguyên, búp một tôm hai lá, hái thủ công. Nước xanh vàng trong, vị chát dịu, thơm mùi cốm. Hộp thiếc 500g.', pricePerUnit: 180000, unit: 'kg' as any, availableQuantity: 200, minOrderQuantity: 1, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1876, harvestDate: '2026-05-01' as any, expiryDate: '2027-05-01' as any },

      // ── Thủy hải sản ──────────────────────────────────────────
      { sellerId: S, sellerType: 'supplier' as any, categoryId: TS, name: 'Tôm sú sạch đông lạnh Cà Mau', description: 'Tôm sú nuôi sinh thái tại Cà Mau, thịt chắc ngọt, không kháng sinh. Đóng gói đông lạnh IQF 1kg/túi. Đạt ASC và tiêu chuẩn xuất khẩu EU.', pricePerUnit: 185000, unit: 'kg' as any, availableQuantity: 2000, minOrderQuantity: 5, farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 4320, harvestDate: '2026-05-25' as any, expiryDate: '2026-11-25' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: TS, name: 'Cá tra phi lê đông lạnh An Giang', description: 'Cá tra phi lê nuôi tại An Giang theo quy trình ASC. Thịt trắng mịn, không mùi bùn, đạt tiêu chuẩn xuất khẩu Mỹ và EU.', pricePerUnit: 65000, unit: 'kg' as any, availableQuantity: 3000, minOrderQuantity: 10, farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 2105, harvestDate: '2026-05-20' as any, expiryDate: '2026-11-20' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: TS, name: 'Mực khô Phú Quốc', description: 'Mực ống đánh bắt tự nhiên tại vùng biển Phú Quốc, phơi khô một nắng truyền thống. Mực to đều, màu hồng nhạt tự nhiên, không chất tẩy trắng.', pricePerUnit: 320000, unit: 'kg' as any, availableQuantity: 100, minOrderQuantity: 1, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1678, harvestDate: '2026-04-20' as any, expiryDate: '2027-04-20' as any },

      // ── Gia vị ────────────────────────────────────────────────
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: GV, name: 'Tiêu đen Phú Quốc', description: 'Tiêu đen hạt to vùng Phú Quốc, được bảo hộ chỉ dẫn địa lý. Vị cay nồng đặc trưng, hương thơm mạnh. Hạt đều đẹp, không tạp chất. OCOP 5 sao.', pricePerUnit: 180000, unit: 'kg' as any, availableQuantity: 200, minOrderQuantity: 1, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 3210, harvestDate: '2026-03-01' as any, expiryDate: '2027-03-01' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: GV, name: 'Nghệ vàng hữu cơ Bình Định', description: 'Nghệ vàng hữu cơ trồng tại Bình Định, hàm lượng curcumin cao trên 5%. Sấy khô, xay mịn không pha trộn.', pricePerUnit: 95000, unit: 'kg' as any, availableQuantity: 300, minOrderQuantity: 1, farmingType: 'organic' as any, status: 'active' as any, viewCount: 2140, harvestDate: '2026-02-15' as any, expiryDate: '2027-02-15' as any },
      { sellerId: S, sellerType: 'supplier' as any, categoryId: GV, name: 'Tỏi đen Lý Sơn lên men tự nhiên', description: 'Tỏi đen lên men từ tỏi Lý Sơn nguyên củ. Vị ngọt nhẹ, không cay, thơm mùi balsamic. Giàu S-allyl cysteine gấp 10 lần tỏi tươi. Hộp 200g.', pricePerUnit: 350000, unit: 'kg' as any, availableQuantity: 50, minOrderQuantity: 1, farmingType: 'organic' as any, status: 'active' as any, viewCount: 4890, harvestDate: '2026-05-01' as any, expiryDate: '2026-11-01' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: GV, name: 'Gừng tươi hữu cơ Kỳ Sơn', description: 'Gừng tươi hữu cơ trồng trên núi Kỳ Sơn – Nghệ An 800m, củ già chắc, tinh dầu nhiều, vị cay nồng đậm đặc.', pricePerUnit: 45000, unit: 'kg' as any, availableQuantity: 400, minOrderQuantity: 5, farmingType: 'organic' as any, status: 'active' as any, viewCount: 1320, harvestDate: '2026-04-20' as any, expiryDate: '2026-07-20' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: GV, name: 'Tinh bột nghệ sạch Bình Định', description: 'Tinh bột nghệ hữu cơ 100% chiết xuất từ nghệ vàng tươi Bình Định. Màu vàng tươi đẹp, mịn mượt, curcumin nguyên vẹn.', pricePerUnit: 250000, unit: 'kg' as any, availableQuantity: 100, minOrderQuantity: 1, farmingType: 'organic' as any, status: 'active' as any, viewCount: 2890, harvestDate: '2026-04-01' as any, expiryDate: '2027-04-01' as any },

      // ── Mật ong & đặc sản ─────────────────────────────────────
      { sellerId: F, sellerType: 'farmer' as any, categoryId: MO, name: 'Mật ong hoa nhãn nguyên chất', description: 'Mật ong hoa nhãn từ đàn ong nuôi tại vườn nhãn Hưng Yên. Màu vàng amber, sánh đặc, vị ngọt thơm hoa nhãn.', pricePerUnit: 180000, unit: 'liter' as any, availableQuantity: 200, minOrderQuantity: 1, farmingType: 'organic' as any, status: 'active' as any, viewCount: 2670, harvestDate: '2026-07-01' as any, expiryDate: '2027-07-01' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: MO, name: 'Mật ong rừng Tây Nguyên', description: 'Mật ong rừng nguyên khai thu từ tổ ong trên cây cổ thụ Tây Nguyên. Màu nâu đậm, vị đậm đà phức hợp nhiều loại hoa rừng.', pricePerUnit: 350000, unit: 'liter' as any, availableQuantity: 80, minOrderQuantity: 1, farmingType: 'organic' as any, status: 'active' as any, viewCount: 5120, harvestDate: '2026-03-15' as any, expiryDate: '2027-03-15' as any },
      { sellerId: S, sellerType: 'supplier' as any, categoryId: MO, name: 'Muối hầm Cần Giờ', description: 'Muối hầm thủ công tại cánh đồng muối Cần Giờ TP.HCM. Muối trắng to hạt, độ mặn cao, giàu khoáng chất tự nhiên.', pricePerUnit: 8000, unit: 'kg' as any, availableQuantity: 10000, minOrderQuantity: 50, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 543, harvestDate: '2026-04-01' as any, expiryDate: '2028-04-01' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: MO, name: 'Dừa xiêm xanh Bến Tre', description: 'Dừa xiêm xanh Bến Tre, trái non 6–8 tháng, nước nhiều ngọt lạnh, cơm mỏng mềm. Thu hoạch tươi, giao trong 24h.', pricePerUnit: 15000, unit: 'piece' as any, availableQuantity: 5000, minOrderQuantity: 50, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1234, harvestDate: '2026-06-01' as any, expiryDate: '2026-06-15' as any },
      { sellerId: S, sellerType: 'supplier' as any, categoryId: MO, name: 'Mắm nêm thùng Phan Thiết', description: 'Mắm nêm cá cơm ủ 12 tháng theo công thức truyền thống Phan Thiết. Màu nâu đỏ đẹp, mùi thơm đặc trưng.', pricePerUnit: 45000, unit: 'liter' as any, availableQuantity: 300, minOrderQuantity: 2, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1102, harvestDate: '2026-01-01' as any, expiryDate: '2026-07-01' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: MO, name: 'Nước mắm cốt nhĩ Phú Quốc 40 độ đạm', description: 'Nước mắm cốt nhĩ Phú Quốc chắt lọc đầu tiên, 40 độ đạm. Màu nâu cánh gián đẹp, mùi thơm dịu. Được bảo hộ GI EU.', pricePerUnit: 120000, unit: 'liter' as any, availableQuantity: 500, minOrderQuantity: 2, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 4230, harvestDate: '2026-01-01' as any, expiryDate: '2027-01-01' as any },
      { sellerId: S, sellerType: 'supplier' as any, categoryId: MO, name: 'Dầu dừa nguyên chất ép lạnh', description: 'Dầu dừa VCO (virgin coconut oil) ép lạnh từ dừa tươi Bến Tre. Mùi dừa nhẹ, trong suốt, điểm nóng 175°C.', pricePerUnit: 180000, unit: 'liter' as any, availableQuantity: 300, minOrderQuantity: 1, farmingType: 'organic' as any, status: 'active' as any, viewCount: 3870, harvestDate: '2026-05-01' as any, expiryDate: '2027-05-01' as any },
      { sellerId: S, sellerType: 'supplier' as any, categoryId: MO, name: 'Cao sâm Ngọc Linh cô đặc', description: 'Cao sâm Ngọc Linh chiết xuất cô đặc, nguồn sâm trồng tại vùng Ngọc Linh Quảng Nam 1500m. Hàm lượng ginsenoside MR2 cao.', pricePerUnit: 8500000, unit: 'kg' as any, availableQuantity: 5, minOrderQuantity: 1, farmingType: 'organic' as any, status: 'active' as any, viewCount: 9876, harvestDate: '2026-02-01' as any, expiryDate: '2028-02-01' as any },

      // ── Hạt & đậu ─────────────────────────────────────────────
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: HD, name: 'Hạt điều rang muối W320', description: 'Hạt điều rang muối W320 từ vùng điều Bình Phước, hạt to đều, không vỡ mảnh. Rang giòn, vị mặn nhẹ, thơm bơ tự nhiên.', pricePerUnit: 180000, unit: 'kg' as any, availableQuantity: 500, minOrderQuantity: 2, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 3456, harvestDate: '2026-03-01' as any, expiryDate: '2026-09-01' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: HD, name: 'Đậu phộng đỏ Bình Định', description: 'Đậu phộng đỏ (lạc đỏ) trồng tại Bình Định, hạt to đều, vỏ đỏ bóng đặc trưng. Hàm lượng dầu cao 45%.', pricePerUnit: 35000, unit: 'kg' as any, availableQuantity: 1200, minOrderQuantity: 10, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 867, harvestDate: '2026-05-01' as any, expiryDate: '2026-11-01' as any },

      // ── Nấm & rau sạch cao cấp ────────────────────────────────
      { sellerId: F, sellerType: 'farmer' as any, categoryId: RAU, name: 'Nấm linh chi đỏ hữu cơ', description: 'Nấm linh chi đỏ trồng trong nhà lưới tại Đà Lạt, bào tử nhiều. Thái lát sấy khô, hàm lượng polysaccharide cao.', pricePerUnit: 650000, unit: 'kg' as any, availableQuantity: 50, minOrderQuantity: 1, farmingType: 'organic' as any, status: 'active' as any, viewCount: 2234, harvestDate: '2026-05-15' as any, expiryDate: '2027-05-15' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: RAU, name: 'Nấm đông cô tươi Lâm Đồng', description: 'Nấm đông cô (shiitake) tươi trồng trên mùn cưa sồi tại Đà Lạt. Mũ nấm dày, nâu đậm, mùi thơm đặc trưng.', pricePerUnit: 80000, unit: 'kg' as any, availableQuantity: 200, minOrderQuantity: 2, farmingType: 'organic' as any, status: 'active' as any, viewCount: 1890, harvestDate: '2026-06-01' as any, expiryDate: '2026-06-08' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: RAU, name: 'Rau xà lách thủy canh Hà Nội', description: 'Xà lách romano thuỷ canh không đất tại Hà Nội. Lá xanh tươi giòn, không thuốc, không chì.', pricePerUnit: 42000, unit: 'kg' as any, availableQuantity: 100, minOrderQuantity: 1, farmingType: 'organic' as any, status: 'active' as any, viewCount: 678, harvestDate: '2026-06-03' as any, expiryDate: '2026-06-07' as any },

      // ── Trái cây phía Bắc ─────────────────────────────────────
      { sellerId: F, sellerType: 'farmer' as any, categoryId: TC, name: 'Đào tiên Mộc Châu', description: 'Đào tiên Mộc Châu – Sơn La, trái to tròn, vỏ vàng ửng đỏ, thịt vàng ngọt thơm. Trồng ở độ cao 1000m.', pricePerUnit: 60000, unit: 'kg' as any, availableQuantity: 350, minOrderQuantity: 5, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1432, harvestDate: '2026-07-10' as any, expiryDate: '2026-07-20' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: TC, name: 'Mận hậu Bắc Hà Lào Cai', description: 'Mận hậu Bắc Hà chín muộn tháng 6–7, quả to đồng đều, vỏ tím mỡ màng, ruột vàng giòn ngọt.', pricePerUnit: 38000, unit: 'kg' as any, availableQuantity: 600, minOrderQuantity: 5, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 2100, harvestDate: '2026-07-05' as any, expiryDate: '2026-07-15' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: TC, name: 'Lê VH6 Bắc Giang', description: 'Lê VH6 lai tạo tại Bắc Giang, quả to hình quả lê cổ điển, vỏ vàng xanh, cùi giòn nhiều nước.', pricePerUnit: 48000, unit: 'kg' as any, availableQuantity: 400, minOrderQuantity: 5, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 543, harvestDate: '2026-08-15' as any, expiryDate: '2026-09-05' as any },

      // ── Hoa & cây cảnh ────────────────────────────────────────
      { sellerId: F, sellerType: 'farmer' as any, categoryId: HOA, name: 'Hoa cúc vàng Đà Lạt', description: 'Hoa cúc vàng tươi cắt cành từ trang trại Đà Lạt, mỗi bó 20 cành. Hoa nở đẹp, cánh dày, màu vàng tươi.', pricePerUnit: 45000, unit: 'bunch' as any, availableQuantity: 500, minOrderQuantity: 5, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 1120, harvestDate: '2026-06-05' as any, expiryDate: '2026-06-12' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: HOA, name: 'Hoa hồng nhập khẩu Ecuador', description: 'Hoa hồng Ecuador thân dài 60–70cm, bông to đẹp 5–6cm, màu sắc đa dạng. Trồng trên cao nguyên 3000m.', pricePerUnit: 85000, unit: 'bunch' as any, availableQuantity: 200, minOrderQuantity: 2, farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 2340, harvestDate: '2026-06-07' as any, expiryDate: '2026-06-21' as any },

      // ── Gia súc & gia cầm ─────────────────────────────────────
      { sellerId: F, sellerType: 'farmer' as any, categoryId: GS, name: 'Trứng gà ta thả vườn Đồng Nai', description: 'Trứng gà ta thả vườn nuôi bằng thức ăn ngũ cốc tự nhiên tại Đồng Nai. Vỏ nâu sần, lòng đỏ đậm màu cam.', pricePerUnit: 65000, unit: 'box' as any, availableQuantity: 1000, minOrderQuantity: 5, farmingType: 'traditional' as any, status: 'active' as any, viewCount: 3456, harvestDate: '2026-06-04' as any, expiryDate: '2026-07-04' as any },
      { sellerId: C, sellerType: 'cooperative' as any, categoryId: GS, name: 'Thịt bò Wagyu F1 Lâm Đồng', description: 'Thịt bò Wagyu F1 nuôi tại trang trại Lâm Đồng, vân mỡ đẹp (marbling score 4–6). Cỏ tươi kết hợp ngũ cốc.', pricePerUnit: 650000, unit: 'kg' as any, availableQuantity: 100, minOrderQuantity: 1, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 5670, harvestDate: '2026-06-01' as any, expiryDate: '2026-06-15' as any },
      { sellerId: F, sellerType: 'farmer' as any, categoryId: GS, name: 'Sữa bò tươi nguyên liệu Mộc Châu', description: 'Sữa bò tươi nguyên liệu từ trang trại bò sữa Mộc Châu, độ béo 3.6%, protein 3.2%. Thanh trùng nhiệt độ thấp.', pricePerUnit: 22000, unit: 'liter' as any, availableQuantity: 500, minOrderQuantity: 5, farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 1890, harvestDate: '2026-06-04' as any, expiryDate: '2026-06-11' as any },
    ];

    const saved = await this.productRepo.save(
      mockProducts.map((p) => this.productRepo.create(p)),
    );

    const FALLBACK = 'https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&q=80';
    await this.imageRepo.save(
      saved.map((p) =>
        this.imageRepo.create({
          productId: p.id,
          imageUrl: FALLBACK,
          isPrimary: true,
          sortOrder: 0,
        }),
      ),
    );

    return { seeded: saved.length, skipped: 0 };
  }
}
