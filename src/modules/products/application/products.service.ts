import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { Product } from '../domain/entities/product.entity';
import { ProductImage } from '../domain/entities/product-image.entity';
import { ProductCertification } from '../domain/entities/product-certification.entity';
import { CreateProductDto } from '../presentation/schemas/create-product.dto';
import { UpdateProductDto } from '../presentation/schemas/update-product.dto';
import { ProductFilterDto } from '../presentation/schemas/product-filter.dto';
import { ProductStatus } from '@common/enums';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,

    @InjectRepository(ProductCertification)
    private readonly certRepo: Repository<ProductCertification>,
  ) { }

  // ─── Create ──────────────────────────────────────────────────

  async create(sellerId: string, dto: CreateProductDto): Promise<Product> {
    const product = this.productRepo.create({
      ...dto,
      sellerId,
      status: ProductStatus.draft,
    });
    return this.productRepo.save(product);
  }

  // ─── Find All + Filter ────────────────────────────────────────

  async findAll(filter: ProductFilterDto): Promise<{ data: Product[]; total: number }> {
    const { page = 1, limit = 20, search, categoryId, provinceId,
      farmingType, status, minPrice, maxPrice, sellerId } = filter;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images', 'images.isPrimary = true')
      .orderBy('p.createdAt', 'DESC')
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
    if (sellerId) qb.andWhere('p.sellerId = :sellerId', { sellerId });

    if (status) {
      qb.andWhere('p.status = :status', { status });
    } else {
      // Mặc định chỉ hiện active — guest/public
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

  // ─── Dev seed (only when DB empty) ───────────────────────────

  async seedMockData(): Promise<{ seeded: number; skipped: number }> {
    const existing = await this.productRepo.count();
    if (existing > 0) return { seeded: 0, skipped: existing };

    const MOCK_SELLER_ID = '00000000-0000-0000-0000-000000000001';

    const mockProducts = [
      {
        sellerId: MOCK_SELLER_ID, sellerType: 'farmer' as any,
        name: 'Xoài cát Hòa Lộc loại 1',
        description: 'Xoài cát Hòa Lộc chính gốc Tiền Giang, trái to đều, vỏ vàng óng, thịt dày ngọt thơm, ít xơ. Canh tác theo tiêu chuẩn VietGAP, không sử dụng chất kích thích tăng trưởng.',
        pricePerUnit: 45000, unit: 'kg' as any, availableQuantity: 500, minOrderQuantity: 10,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 1284,
        harvestDate: '2025-06-15' as any, expiryDate: '2025-06-22' as any,
      },
      {
        sellerId: MOCK_SELLER_ID, sellerType: 'farmer' as any,
        name: 'Rau muống hữu cơ Đà Lạt',
        description: 'Rau muống trồng theo hướng hữu cơ tại Đà Lạt, không thuốc trừ sâu, tươi ngon mỗi ngày. Phù hợp bếp ăn gia đình và nhà hàng.',
        pricePerUnit: 25000, unit: 'kg' as any, availableQuantity: 200, minOrderQuantity: 5,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 892,
        harvestDate: '2025-06-01' as any, expiryDate: '2025-06-05' as any,
      },
      {
        sellerId: MOCK_SELLER_ID, sellerType: 'cooperative' as any,
        name: 'Thanh long ruột đỏ xuất khẩu',
        description: 'Thanh long ruột đỏ Bình Thuận đạt chuẩn GlobalGAP, đủ điều kiện xuất khẩu sang EU và Nhật Bản. Trái đều, màu đỏ đậm, vị ngọt thanh.',
        pricePerUnit: 35000, unit: 'kg' as any, availableQuantity: 1000, minOrderQuantity: 50,
        farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 2105,
        harvestDate: '2025-06-20' as any, expiryDate: '2025-06-27' as any,
      },
      {
        sellerId: MOCK_SELLER_ID, sellerType: 'farmer' as any,
        name: 'Gạo ST25 đặc sản Sóc Trăng',
        description: 'Gạo ST25 do ông Hồ Quang Cua lai tạo, từng đạt giải gạo ngon nhất thế giới. Hạt dài, cơm thơm dẻo, vị ngọt tự nhiên.',
        pricePerUnit: 28000, unit: 'kg' as any, availableQuantity: 2000, minOrderQuantity: 20,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 5432,
        harvestDate: '2025-05-30' as any, expiryDate: '2026-05-30' as any,
      },
      {
        sellerId: MOCK_SELLER_ID, sellerType: 'farmer' as any,
        name: 'Cà phê Arabica Cầu Đất',
        description: 'Cà phê Arabica trồng tại vùng Cầu Đất 1500m so mực nước biển. Hữu cơ 100%, rang mộc theo phương pháp truyền thống. Hương thơm fruity, vị chua thanh cân bằng.',
        pricePerUnit: 120000, unit: 'kg' as any, availableQuantity: 150, minOrderQuantity: 2,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 764,
        harvestDate: '2024-12-01' as any, expiryDate: '2025-12-01' as any,
      },
      {
        sellerId: MOCK_SELLER_ID, sellerType: 'cooperative' as any,
        name: 'Bưởi da xanh Bến Tre',
        description: 'Bưởi da xanh đặc sản Bến Tre, vỏ xanh bóng, múi to, tép mọng nước, vị ngọt ít đắng. Đạt VietGAP, trái đồng đều từ 1.2–1.8kg/trái.',
        pricePerUnit: 32000, unit: 'kg' as any, availableQuantity: 800, minOrderQuantity: 10,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 1120,
        harvestDate: '2025-07-01' as any, expiryDate: '2025-07-20' as any,
      },
      {
        sellerId: MOCK_SELLER_ID, sellerType: 'farmer' as any,
        name: 'Dưa hấu không hạt Long An',
        description: 'Dưa hấu không hạt trồng tại Long An, vỏ mỏng, ruột đỏ tươi, ngọt sắc. Trọng lượng 3–6kg/quả. Thích hợp dùng ngay hoặc làm nước ép.',
        pricePerUnit: 18000, unit: 'kg' as any, availableQuantity: 3000, minOrderQuantity: 30,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 987,
        harvestDate: '2025-06-10' as any, expiryDate: '2025-06-20' as any,
      },
      {
        sellerId: MOCK_SELLER_ID, sellerType: 'cooperative' as any,
        name: 'Sầu riêng Ri6 Cai Lậy',
        description: 'Sầu riêng Ri6 vùng Cai Lậy – Tiền Giang, cơm vàng hạt lép, mùi thơm nồng đặc trưng. Thu hoạch đúng độ chín, không dùng chất thúc chín.',
        pricePerUnit: 85000, unit: 'kg' as any, availableQuantity: 600, minOrderQuantity: 5,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 3250,
        harvestDate: '2025-07-15' as any, expiryDate: '2025-07-22' as any,
      },
    ];

    const saved = await this.productRepo.save(
      mockProducts.map((p) => this.productRepo.create(p)),
    );

    const imageMap: Record<string, string> = {
      'Xoài cát Hòa Lộc loại 1': 'https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=600&q=80',
      'Rau muống hữu cơ Đà Lạt': 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&q=80',
      'Thanh long ruột đỏ xuất khẩu': 'https://images.unsplash.com/photo-1507908708918-778587c9e563?w=600&q=80',
      'Gạo ST25 đặc sản Sóc Trăng': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80',
      'Cà phê Arabica Cầu Đất': 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=600&q=80',
      'Bưởi da xanh Bến Tre': 'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=600&q=80',
      'Dưa hấu không hạt Long An': 'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=600&q=80',
      'Sầu riêng Ri6 Cai Lậy': 'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=600&q=80',
    };

    await this.imageRepo.save(
      saved.map((p) =>
        this.imageRepo.create({
          productId: p.id,
          imageUrl: imageMap[p.name] ?? 'https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&q=80',
          isPrimary: true,
          sortOrder: 0,
        }),
      ),
    );

    return { seeded: saved.length, skipped: 0 };
  }
}