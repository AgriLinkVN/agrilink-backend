import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from '../domain/entities/product.entity';
import { ProductImage } from '../domain/entities/product-image.entity';
import { ProductCertification } from '../domain/entities/product-certification.entity';
import { ProductCategory } from '../domain/entities/product-category.entity';
import { CreateProductDto } from '../presentation/schemas/create-product.dto';
import { UpdateProductDto } from '../presentation/schemas/update-product.dto';
import { ProductFilterDto } from '../presentation/schemas/product-filter.dto';
import {
  FarmingType,
  ProductStatus,
  ProductUnit,
  SellerType,
} from '@common/enums';
import { User } from '../../users/entities/user.entity';
import { Province } from '../../geography/entities/province.entity';

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

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Province)
    private readonly provinceRepo: Repository<Province>,
  ) { }

  // ─── Categories ───────────────────────────────────────────────

  async findCategories(): Promise<ProductCategory[]> {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

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

  // ─── Create ──────────────────────────────────────────────────

  async create(
  sellerId: string,
  sellerType: SellerType,  // ← từ JWT
  dto: CreateProductDto,
): Promise<Product> {
  const product = this.productRepo.create({
    ...dto,
    sellerId,
    sellerType,  // ← không từ dto nữa
    status: ProductStatus.draft,
  });
  return this.productRepo.save(product);
  }

  // ─── Find All + Filter ────────────────────────────────────────

  async findAll(
    filter: ProductFilterDto,
    currentUserId?: string,  // ← thêm vào
  ): Promise<{ data: Product[]; total: number }> {
    const { page = 1, limit = 20, search, categoryId, provinceId,
      farmingType, status, minPrice, maxPrice, sellerId,
      sortBy = 'createdAt', order = 'DESC' } = filter;

    const SORT_COLUMN_MAP: Record<string, string> = {
      createdAt: 'p.createdAt',
      pricePerUnit: 'p.pricePerUnit',
      name: 'p.name',
    };

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images', 'images.isPrimary = true')
      .orderBy(SORT_COLUMN_MAP[sortBy], order)
      .skip((page - 1) * limit)
      .take(limit);

    // Search
    if (search) {
      qb.andWhere(
        'p.name ILIKE :search OR p.description ILIKE :search',
        { search: `%${search}%` },
      );
    }

    // Filters
    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (provinceId) qb.andWhere('p.provinceId = :provinceId', { provinceId });
    if (farmingType) qb.andWhere('p.farmingType = :farmingType', { farmingType });
      // Seller xem được tất cả SP của mình kể cả draft
    // Guest/buyer chỉ xem active
    if (sellerId && sellerId === currentUserId) {
      qb.andWhere('p.sellerId = :sellerId', { sellerId });
      if (status) qb.andWhere('p.status = :status', { status });
    } else if (sellerId) {
      qb.andWhere('p.sellerId = :sellerId', { sellerId });
      qb.andWhere('p.status = :status', { status: ProductStatus.active });
    } else {
      qb.andWhere('p.status = :status', { status: ProductStatus.active });
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

  // ─── Find One ─────────────────────────────────────────────────

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'images', 'certifications'],
    });

    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm`);

    // Tăng view count
    await this.productRepo.increment({ id }, 'viewCount', 1);

    return product;
  }

  // ─── Update ─────────────────────────────────────────────────── 

  async update(id: string, sellerId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa sản phẩm này');
    }

    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  // ─── Remove ───────────────────────────────────────────────────

  async remove(id: string, sellerId: string): Promise<void> {
    const product = await this.findOne(id);

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền xóa sản phẩm này');
    }

    // Soft delete — đổi status thay vì xóa hẳn
    product.status = ProductStatus.draft;
    await this.productRepo.save(product);
  }

  // ─── Images ───────────────────────────────────────────────────

  async addImage(
    productId: string,
    imageUrl: string,
    isPrimary: boolean,
  ): Promise<ProductImage> {
    // Nếu isPrimary → reset tất cả ảnh cũ
    if (isPrimary) {
      await this.imageRepo.update({ productId }, { isPrimary: false });
    }

    // Đếm sort_order hiện tại
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
    data: Partial<ProductCertification>,
  ): Promise<ProductCertification> {
    await this.findOne(productId); // kiểm tra product tồn tại

    const cert = this.certRepo.create({ ...data, productId });
    return this.certRepo.save(cert);
  }

  async removeCertification(productId: string, certId: string): Promise<void> {
    const cert = await this.certRepo.findOne({
      where: { id: certId, productId },
    });

    if (!cert) throw new NotFoundException('Không tìm thấy chứng nhận');

    await this.certRepo.remove(cert);
  }

  // ─── Dev seed ─────────────────────────────────────────────────

  /** Seed 50 mock products, chỉ chạy khi products table trống. Idempotent. */
  async seedMockData(): Promise<{ created: number; skipped?: string }> {
    const existing = await this.productRepo.count();
    if (existing > 0) {
      return { created: 0, skipped: `Products table không trống (${existing} rows). Dùng /products/seed/reset để xoá và reseed.` };
    }
    return this.generateMockProducts(50);
  }

  /** Xoá sạch products + images rồi reseed 50 mock products. */
  async resetAndSeed(): Promise<{ created: number; skipped?: string }> {
    await this.imageRepo.createQueryBuilder().delete().execute();
    await this.certRepo.createQueryBuilder().delete().execute();
    await this.productRepo.createQueryBuilder().delete().execute();
    return this.generateMockProducts(50);
  }

  private async generateMockProducts(target: number): Promise<{ created: number; skipped?: string }> {
    const sellers = await this.userRepo.find({
      where: [
        { phone: '0900000001' },
        { phone: '0900000002' },
        { phone: '0900000003' },
      ],
    });
    if (sellers.length === 0) {
      return { created: 0, skipped: 'Chưa có demo sellers. Chạy `npm run seed` trước để tạo sellers + provinces + categories.' };
    }

    const provinces = await this.provinceRepo.find();
    const categories = await this.categoryRepo.find({ where: { isActive: true } });
    if (!provinces.length || !categories.length) {
      return { created: 0, skipped: 'Thiếu provinces hoặc categories. Chạy `npm run seed` trước.' };
    }

    const SELLER_TYPE: Record<string, SellerType> = {
      farmer: SellerType.farmer,
      cooperative: SellerType.cooperative,
      supplier: SellerType.supplier,
    };
    const FARMING_TYPES = [
      FarmingType.organic,
      FarmingType.vietgap,
      FarmingType.globalgap,
      FarmingType.traditional,
    ];
    const UNITS = [ProductUnit.kg, ProductUnit.box, ProductUnit.bunch];
    const NAMES = [
      'Xoài cát', 'Bưởi da xanh', 'Sầu riêng Ri6', 'Thanh long ruột đỏ',
      'Rau muống', 'Cà rốt', 'Nấm bào ngư', 'Gạo ST25', 'Gạo Jasmine',
      'Cà phê Arabica', 'Cà phê Robusta', 'Tiêu đen', 'Hạt điều', 'Đậu phộng',
    ];

    let created = 0;
    for (let i = 0; i < target; i++) {
      const seller = sellers[i % sellers.length];
      const province = provinces[i % provinces.length];
      const category = categories[i % categories.length];

      const product = await this.productRepo.save({
        sellerId: seller.id,
        sellerType: SELLER_TYPE[seller.role] ?? SellerType.farmer,
        name: `${NAMES[i % NAMES.length]} #${i + 1}`,
        description: `Mock product ${i + 1} — ${province.name}`,
        categoryId: category.id,
        pricePerUnit: 10000 + (i % 20) * 5000,
        unit: UNITS[i % UNITS.length],
        availableQuantity: 100 + i * 10,
        status: ProductStatus.active,
        farmingType: FARMING_TYPES[i % FARMING_TYPES.length],
        provinceId: province.id,
      });

      await this.imageRepo.save({
        productId: product.id,
        imageUrl: `https://picsum.photos/seed/product-${i}/600/450`,
        isPrimary: true,
        sortOrder: 0,
      });

      created++;
    }

    return { created };
  }
}