import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CertificationStatus, ProductStatus, SellerType } from '@common/enums';
import {
  CreateProductCertificationInput,
  CreateProductInput,
  ProductFilterInput,
  WishlistQueryInput,
} from '../../application/models/product-input.model';
import {
  ProductDetailCategory,
  ProductDetailLocation,
  ProductDetailResponse,
  ProductDetailSeller,
} from '../../application/models/product-detail.model';
import {
  ProductCategoryModel,
  ProductCertificationModel,
  ProductImageModel,
  ProductModel,
  WishlistModel,
} from '../../application/models/product.model';
import {
  ProductCatalogQueryPort,
  ProductCategoryQueryPort,
  ProductCertificationRepositoryPort,
  ProductDetailQueryPort,
  ProductImageRepositoryPort,
  ProductRepositoryPort,
  ProductSeedRepositoryPort,
  ProductWishlistRepositoryPort,
} from '../../application/ports/outbound/product-repository.port';
import { Product } from '../persistence/entities/product.entity';
import { ProductCategory } from '../persistence/entities/product-category.entity';
import { ProductCertification } from '../persistence/entities/product-certification.entity';
import { ProductImage } from '../persistence/entities/product-image.entity';
import { Wishlist } from '../persistence/entities/wishlist.entity';
import { seedProductCategories } from '../database/seeds/product-category.seed';

@Injectable()
export class TypeOrmProductRepository
  implements
    ProductRepositoryPort,
    ProductCatalogQueryPort,
    ProductDetailQueryPort,
    ProductCategoryQueryPort,
    ProductImageRepositoryPort,
    ProductCertificationRepositoryPort,
    ProductWishlistRepositoryPort,
    ProductSeedRepositoryPort
{
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
    private readonly dataSource: DataSource,
  ) {}

  async findRootCategories(): Promise<ProductCategoryModel[]> {
    return this.categoryRepo.find({
      where: { parentId: null as unknown as string, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async getCategoryTree(): Promise<ProductCategoryModel[]> {
    const all = await this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    const byParent = new Map<string | null, ProductCategory[]>();
    for (const category of all) {
      const key = category.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(category);
    }

    const roots = byParent.get(null) ?? [];
    for (const root of roots) {
      (root as ProductCategory & { children: ProductCategory[] }).children =
        byParent.get(root.id) ?? [];
    }

    return roots;
  }

  async findAllCategories(): Promise<ProductCategoryModel[]> {
    return this.categoryRepo.find();
  }

  async findAll(
    filter: ProductFilterInput,
    currentUserId?: string,
  ): Promise<{ data: ProductModel[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      provinceId,
      farmingType,
      status,
      minPrice,
      maxPrice,
      sellerId,
      isFeatured,
      sortBy = 'createdAt',
      order = 'DESC',
    } = filter;

    const sortColumnMap: Record<string, string> = {
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
      .leftJoinAndSelect(
        'p.certifications',
        'certifications',
        'certifications.status = :verifiedCertificationStatus',
        { verifiedCertificationStatus: CertificationStatus.VERIFIED },
      )
      .orderBy(sortColumnMap[sortBy], order)
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('p.name ILIKE :search OR p.description ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (provinceId) qb.andWhere('p.provinceId = :provinceId', { provinceId });
    if (farmingType) {
      qb.andWhere('p.farmingType = :farmingType', { farmingType });
    }
    if (isFeatured !== undefined) {
      qb.andWhere('p.isFeatured = :isFeatured', { isFeatured });
    }

    if (sellerId && sellerId === currentUserId) {
      qb.andWhere('p.sellerId = :sellerId', { sellerId });
      if (status) qb.andWhere('p.status = :status', { status });
    } else if (sellerId) {
      qb.andWhere('p.sellerId = :sellerId', { sellerId });
      qb.andWhere('p.status = :status', { status: ProductStatus.ACTIVE });
    } else {
      qb.andWhere('p.status = :status', { status: ProductStatus.ACTIVE });
    }

    if (minPrice !== undefined) {
      qb.andWhere('p.pricePerUnit >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('p.pricePerUnit <= :maxPrice', { maxPrice });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findMine(
    sellerId: string,
    filter: ProductFilterInput,
  ): Promise<{ data: ProductModel[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      provinceId,
      farmingType,
      status,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      order = 'DESC',
    } = filter;

    const sortColumnMap: Record<string, string> = {
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
      .leftJoinAndSelect('p.certifications', 'certifications')
      .where('p.sellerId = :sellerId', { sellerId })
      .orderBy(sortColumnMap[sortBy], order)
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('p.name ILIKE :search OR p.description ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (provinceId) qb.andWhere('p.provinceId = :provinceId', { provinceId });
    if (farmingType) {
      qb.andWhere('p.farmingType = :farmingType', { farmingType });
    }
    if (status) qb.andWhere('p.status = :status', { status });
    if (minPrice !== undefined) {
      qb.andWhere('p.pricePerUnit >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('p.pricePerUnit <= :maxPrice', { maxPrice });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createAtomically(
    sellerId: string,
    sellerType: SellerType,
    input: CreateProductInput,
  ): Promise<ProductModel> {
    const { images = [], ...productData } = input;

    return this.dataSource.transaction(async (manager) => {
      const product = manager.create(Product, {
        ...productData,
        sellerId,
        sellerType,
        status: ProductStatus.DRAFT,
      });
      const savedProduct = await manager.save(Product, product);

      if (images.length > 0) {
        const hasPrimary = images.some((image) => image.isPrimary);
        await manager.save(
          ProductImage,
          images.map((image, index) =>
            manager.create(ProductImage, {
              productId: savedProduct.id,
              imageUrl: image.imageUrl,
              isPrimary: hasPrimary ? !!image.isPrimary : index === 0,
              sortOrder: image.sortOrder ?? index,
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

  async findByIdWithRelations(id: string): Promise<ProductModel | null> {
    return this.productRepo.findOne({
      where: { id },
      relations: ['category', 'category.parent', 'images', 'certifications'],
    });
  }

  async findActiveById(id: string): Promise<ProductModel | null> {
    return this.productRepo.findOne({
      where: { id, status: ProductStatus.ACTIVE },
    });
  }

  async save(product: ProductModel): Promise<ProductModel> {
    return this.productRepo.save(product as Product);
  }

  async findOne(id: string): Promise<ProductDetailResponse | null> {
    const product = await this.findByIdWithRelations(id);
    if (!product) return null;

    void this.productRepo
      .increment({ id }, 'viewCount', 1)
      .catch(() => undefined);

    const [seller, province, district] = await Promise.all([
      this.populateSeller(product.sellerId, product.sellerType),
      this.findLocation('provinces', product.provinceId),
      this.findLocation('districts', product.districtId),
    ]);

    return this.toDetailResponse(product, seller, province, district);
  }

  async addImage(
    productId: string,
    imageUrl: string,
    isPrimary: boolean,
  ): Promise<ProductImageModel> {
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

  async removeImageByProduct(
    productId: string,
    imageId: string,
  ): Promise<boolean> {
    const image = await this.imageRepo.findOne({
      where: { id: imageId, productId },
    });
    if (!image) return false;
    await this.imageRepo.remove(image);
    return true;
  }

  async addCertification(
    productId: string,
    input: CreateProductCertificationInput,
  ): Promise<ProductCertificationModel> {
    const cert = this.certRepo.create({
      ...input,
      productId,
      issuedDate: this.toOptionalDate(input.issuedDate),
      expiryDate: this.toOptionalDate(input.expiryDate),
      isVerified: false,
      status: CertificationStatus.PENDING,
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
    });
    return this.certRepo.save(cert);
  }

  async findPending(): Promise<ProductCertificationModel[]> {
    return this.certRepo.find({
      where: { status: CertificationStatus.PENDING },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByIdWithProduct(
    certId: string,
  ): Promise<ProductCertificationModel | null> {
    return this.certRepo.findOne({
      where: { id: certId },
      relations: ['product'],
    });
  }

  async saveCertification(
    certification: ProductCertificationModel,
  ): Promise<ProductCertificationModel> {
    return this.certRepo.save(certification as ProductCertification);
  }

  async removeCertificationByProduct(
    productId: string,
    certId: string,
  ): Promise<boolean> {
    const cert = await this.certRepo.findOne({
      where: { id: certId, productId },
    });
    if (!cert) return false;
    await this.certRepo.remove(cert);
    return true;
  }

  async findByUserAndProduct(
    userId: string,
    productId: string,
  ): Promise<WishlistModel | null> {
    return this.wishlistRepo.findOne({ where: { userId, productId } });
  }

  async addIfAbsent(userId: string, productId: string): Promise<WishlistModel> {
    await this.wishlistRepo
      .createQueryBuilder()
      .insert()
      .into(Wishlist)
      .values({ userId, productId })
      .orIgnore()
      .execute();

    const entry = await this.wishlistRepo.findOne({
      where: { userId, productId },
    });
    if (!entry) {
      throw new Error('Wishlist write did not return a persisted item');
    }
    return entry;
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.wishlistRepo.delete({ userId, productId });
  }

  async getWishlist(
    userId: string,
    query: WishlistQueryInput,
  ): Promise<{
    data: ProductModel[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const qb = this.wishlistRepo
      .createQueryBuilder('w')
      .innerJoinAndSelect('w.product', 'p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images', 'images.isPrimary = true')
      .leftJoinAndSelect(
        'p.certifications',
        'certifications',
        'certifications.status = :verifiedCertificationStatus',
        { verifiedCertificationStatus: CertificationStatus.VERIFIED },
      )
      .where('w.userId = :userId', { userId })
      .andWhere('p.status = :status', { status: ProductStatus.ACTIVE })
      .orderBy('w.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items.map((item) => item.product),
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

  async seedCategories(): Promise<void> {
    await seedProductCategories(this.dataSource);
  }

  async countProducts(): Promise<number> {
    return this.productRepo.count();
  }

  async resetProducts(): Promise<number> {
    const deleted = await this.productRepo.count();
    await this.certRepo.clear();
    await this.imageRepo.clear();
    await this.productRepo.query('TRUNCATE TABLE products CASCADE');
    return deleted;
  }

  async saveSeedProducts(
    products: Array<Partial<ProductModel>>,
  ): Promise<ProductModel[]> {
    return this.productRepo.save(
      products.map((product) =>
        this.productRepo.create(product as Partial<Product>),
      ),
    );
  }

  async savePrimaryImagesForProducts(
    products: ProductModel[],
    imageUrl: string,
  ): Promise<void> {
    await this.imageRepo.save(
      products.map((product) =>
        this.imageRepo.create({
          productId: product.id,
          imageUrl,
          isPrimary: true,
          sortOrder: 0,
        }),
      ),
    );
  }

  private toOptionalDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
  }

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
      table === 'provinces' ? 'id, name, code, region' : 'id, name, code';
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
    product: ProductModel,
    seller: ProductDetailSeller | null,
    province: ProductDetailLocation | null,
    district: ProductDetailLocation | null,
  ): ProductDetailResponse {
    const toIsoDate = (
      date: Date | string | null | undefined,
    ): string | null => {
      if (!date) return null;
      return typeof date === 'string' ? date : date.toISOString();
    };

    const category: ProductDetailCategory | null = product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
          iconUrl: product.category.iconUrl ?? null,
          description: product.category.description ?? null,
          parent: product.category.parent
            ? {
                id: product.category.parent.id,
                name: product.category.parent.name,
                slug: product.category.parent.slug,
              }
            : null,
        }
      : null;

    const images = (product.images ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        altText: image.altText ?? null,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      }));

    const certifications = (product.certifications ?? []).map(
      (certification) => ({
        id: certification.id,
        certType: certification.certType,
        certNumber: certification.certNumber ?? null,
        issuedBy: certification.issuedBy ?? null,
        issuedDate: toIsoDate(certification.issuedDate),
        expiryDate: toIsoDate(certification.expiryDate),
        isVerified: certification.isVerified,
        status: certification.status,
        verifiedBy: certification.verifiedBy ?? null,
        verifiedAt: toIsoDate(certification.verifiedAt),
        rejectionReason: certification.rejectionReason ?? null,
      }),
    );

    return {
      id: product.id,
      name: product.name,
      description: product.description ?? null,
      sku: product.sku ?? null,
      variety: product.variety ?? null,
      pricePerUnit: Number(product.pricePerUnit),
      unit: product.unit,
      availableQuantity: Number(product.availableQuantity),
      minOrderQuantity:
        product.minOrderQuantity != null
          ? Number(product.minOrderQuantity)
          : null,
      farmingType: product.farmingType ?? null,
      status: product.status,
      harvestDate: toIsoDate(product.harvestDate),
      expiryDate: toIsoDate(product.expiryDate),
      rejectionReason: product.rejectionReason ?? null,
      isFeatured: product.isFeatured,
      viewCount: product.viewCount,
      soldCount: Number(product.soldCount ?? 0),
      avgRating: Number(product.avgRating ?? 0),
      farmLatitude: product.farmLatitude ?? null,
      farmLongitude: product.farmLongitude ?? null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      province,
      district,
      category,
      images,
      certifications,
      seller,
    };
  }
}
