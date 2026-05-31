import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { Product } from '../domain/entities/product.entity';
import { ProductCategory } from '../domain/entities/product-category.entity';
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

    @InjectRepository(ProductCategory)
    private readonly categoryRepo: Repository<ProductCategory>,
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

  // ─── Dev seed ────────────────────────────────────────────────

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

    // Build slug → id map from existing categories
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
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: TC,
        name: 'Xoài cát Hòa Lộc loại 1',
        description: 'Xoài cát Hòa Lộc chính gốc Tiền Giang, trái to đều, vỏ vàng óng, thịt dày ngọt thơm, ít xơ. Canh tác theo tiêu chuẩn VietGAP, không sử dụng chất kích thích tăng trưởng.',
        pricePerUnit: 45000, unit: 'kg' as any, availableQuantity: 500, minOrderQuantity: 10,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 1284,
        harvestDate: '2026-06-15' as any, expiryDate: '2026-06-22' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: TC,
        name: 'Thanh long ruột đỏ xuất khẩu',
        description: 'Thanh long ruột đỏ Bình Thuận đạt chuẩn GlobalGAP, đủ điều kiện xuất khẩu sang EU và Nhật Bản. Trái đều, màu đỏ đậm, vị ngọt thanh.',
        pricePerUnit: 35000, unit: 'kg' as any, availableQuantity: 1000, minOrderQuantity: 50,
        farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 2105,
        harvestDate: '2026-06-20' as any, expiryDate: '2026-06-27' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: TC,
        name: 'Sầu riêng Ri6 Cai Lậy',
        description: 'Sầu riêng Ri6 vùng Cai Lậy – Tiền Giang, cơm vàng hạt lép, mùi thơm nồng đặc trưng. Thu hoạch đúng độ chín, không dùng chất thúc chín.',
        pricePerUnit: 85000, unit: 'kg' as any, availableQuantity: 600, minOrderQuantity: 5,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 3250,
        harvestDate: '2026-07-15' as any, expiryDate: '2026-07-22' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: TC,
        name: 'Bưởi da xanh Bến Tre',
        description: 'Bưởi da xanh đặc sản Bến Tre, vỏ xanh bóng, múi to, tép mọng nước, vị ngọt ít đắng. Đạt VietGAP, trái đồng đều từ 1.2–1.8kg/trái.',
        pricePerUnit: 32000, unit: 'kg' as any, availableQuantity: 800, minOrderQuantity: 10,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 1120,
        harvestDate: '2026-07-01' as any, expiryDate: '2026-07-20' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: TC,
        name: 'Dưa hấu không hạt Long An',
        description: 'Dưa hấu không hạt trồng tại Long An, vỏ mỏng, ruột đỏ tươi, ngọt sắc. Trọng lượng 3–6kg/quả. Thích hợp dùng ngay hoặc làm nước ép.',
        pricePerUnit: 18000, unit: 'kg' as any, availableQuantity: 3000, minOrderQuantity: 30,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 987,
        harvestDate: '2026-06-10' as any, expiryDate: '2026-06-20' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: TC,
        name: 'Nhãn lồng Hưng Yên',
        description: 'Nhãn lồng chính gốc Hưng Yên, cùi dày, hạt nhỏ, vị ngọt đậm thơm. Mùa vụ tháng 7–8, thu hái khi trái chín đều. Không ướp hóa chất bảo quản.',
        pricePerUnit: 55000, unit: 'kg' as any, availableQuantity: 400, minOrderQuantity: 5,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1890,
        harvestDate: '2026-07-20' as any, expiryDate: '2026-07-30' as any,
      },
      {
        sellerId: S, sellerType: 'supplier' as any, categoryId: TC,
        name: 'Vải thiều Lục Ngạn Bắc Giang',
        description: 'Vải thiều Lục Ngạn được cấp chỉ dẫn địa lý, xuất khẩu sang 30 quốc gia. Vỏ đỏ tươi, hạt nhỏ, cùi giòn ngọt. Đạt GlobalGAP và OCOP 4 sao.',
        pricePerUnit: 42000, unit: 'kg' as any, availableQuantity: 1500, minOrderQuantity: 20,
        farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 4120,
        harvestDate: '2026-06-05' as any, expiryDate: '2026-06-15' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: TC,
        name: 'Cam sành Hà Giang',
        description: 'Cam sành vùng cao Hà Giang, vỏ sần xù đặc trưng, ruột vàng cam đẹp, vị chua ngọt hài hòa, nhiều vitamin C. Không dùng thuốc kích màu.',
        pricePerUnit: 38000, unit: 'kg' as any, availableQuantity: 700, minOrderQuantity: 10,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 654,
        harvestDate: '2026-01-15' as any, expiryDate: '2026-02-28' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: TC,
        name: 'Dứa MD2 Ninh Bình',
        description: 'Dứa MD2 (dứa vàng) nhập giống từ Hawaii, trồng tại Ninh Bình. Ruột vàng, ít xơ, độ Brix 15–17, ngọt hơn dứa Queen thông thường 30%.',
        pricePerUnit: 28000, unit: 'kg' as any, availableQuantity: 900, minOrderQuantity: 15,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 776,
        harvestDate: '2026-05-10' as any, expiryDate: '2026-05-25' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: TC,
        name: 'Ổi lê Đài Loan không hạt',
        description: 'Ổi lê không hạt trồng theo quy trình VietGAP tại Bình Dương. Trái to tròn, vỏ xanh mướt, ruột trắng giòn ngọt nhẹ. Thích hợp làm quà biếu.',
        pricePerUnit: 35000, unit: 'kg' as any, availableQuantity: 300, minOrderQuantity: 5,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 512,
        harvestDate: '2026-05-20' as any, expiryDate: '2026-05-30' as any,
      },

      // ── Rau củ ────────────────────────────────────────────────
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: RAU,
        name: 'Rau muống hữu cơ Đà Lạt',
        description: 'Rau muống trồng theo hướng hữu cơ tại Đà Lạt, không thuốc trừ sâu, tươi ngon mỗi ngày. Phù hợp bếp ăn gia đình và nhà hàng.',
        pricePerUnit: 25000, unit: 'kg' as any, availableQuantity: 200, minOrderQuantity: 5,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 892,
        harvestDate: '2026-06-01' as any, expiryDate: '2026-06-05' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: RAU,
        name: 'Rau cải bắp VietGAP Lâm Đồng',
        description: 'Bắp cải trắng trồng tại cao nguyên Lâm Đồng 900m, khí hậu mát mẻ giúp cải giòn chắc, lá xanh đậm. Đạt chứng nhận VietGAP, cung cấp siêu thị.',
        pricePerUnit: 12000, unit: 'kg' as any, availableQuantity: 2000, minOrderQuantity: 50,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 445,
        harvestDate: '2026-05-28' as any, expiryDate: '2026-06-05' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: RAU,
        name: 'Cà chua bi hữu cơ Đà Lạt',
        description: 'Cà chua bi hữu cơ 100% Đà Lạt, trồng trong nhà kính. Trái nhỏ đỏ đều, vị chua ngọt đậm, giàu lycopene. Không thuốc trừ sâu, phân hóa học.',
        pricePerUnit: 48000, unit: 'kg' as any, availableQuantity: 150, minOrderQuantity: 3,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 1230,
        harvestDate: '2026-06-03' as any, expiryDate: '2026-06-10' as any,
      },
      {
        sellerId: S, sellerType: 'supplier' as any, categoryId: RAU,
        name: 'Khoai lang tím Nhật Vĩnh Long',
        description: 'Khoai lang tím giống Nhật trồng tại Vĩnh Long, củ đều đẹp, ruột tím đậm, hàm lượng anthocyanin cao. Xuất khẩu sang Nhật và Hàn Quốc.',
        pricePerUnit: 22000, unit: 'kg' as any, availableQuantity: 3000, minOrderQuantity: 100,
        farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 2340,
        harvestDate: '2026-05-15' as any, expiryDate: '2026-08-15' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: RAU,
        name: 'Bí đỏ Hokaido Gia Lai',
        description: 'Bí đỏ Hokaido (bí hồ lô Nhật) trồng tại Gia Lai, trọng lượng 1–2kg/quả, ruột vàng đặc, vị ngọt bùi. Tốt cho bé ăn dặm và người ăn kiêng.',
        pricePerUnit: 30000, unit: 'kg' as any, availableQuantity: 500, minOrderQuantity: 10,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 388,
        harvestDate: '2026-06-12' as any, expiryDate: '2026-09-12' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: RAU,
        name: 'Hành tím Vĩnh Châu Sóc Trăng',
        description: 'Hành tím Vĩnh Châu nổi tiếng cả nước, củ nhỏ chắc, màu tím đặc trưng, mùi hăng nồng. Phơi khô tự nhiên, bảo quản được 6 tháng. Đạt OCOP 3 sao.',
        pricePerUnit: 28000, unit: 'kg' as any, availableQuantity: 5000, minOrderQuantity: 50,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1540,
        harvestDate: '2026-04-10' as any, expiryDate: '2026-10-10' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: RAU,
        name: 'Măng tây xanh Ninh Thuận',
        description: 'Măng tây xanh trồng tại Ninh Thuận, đất pha cát thổ nhưỡng đặc biệt. Chồi non mập mạp, giòn ngọt, giàu axit folic và vitamin K. Hái tươi hàng ngày.',
        pricePerUnit: 65000, unit: 'kg' as any, availableQuantity: 120, minOrderQuantity: 2,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 921,
        harvestDate: '2026-06-02' as any, expiryDate: '2026-06-05' as any,
      },

      // ── Gạo & ngũ cốc ─────────────────────────────────────────
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: GAO,
        name: 'Gạo ST25 đặc sản Sóc Trăng',
        description: 'Gạo ST25 do ông Hồ Quang Cua lai tạo, từng đạt giải gạo ngon nhất thế giới. Hạt dài, cơm thơm dẻo, vị ngọt tự nhiên.',
        pricePerUnit: 28000, unit: 'kg' as any, availableQuantity: 2000, minOrderQuantity: 20,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 5432,
        harvestDate: '2026-05-30' as any, expiryDate: '2027-05-30' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: GAO,
        name: 'Gạo hữu cơ Séng Cù Mường Khương',
        description: 'Gạo Séng Cù hữu cơ vùng núi Mường Khương – Lào Cai 1200m. Hạt mập, cơm dẻo thơm mùi lá dứa tự nhiên. Được Nhật Bản cấp chứng nhận hữu cơ JAS.',
        pricePerUnit: 52000, unit: 'kg' as any, availableQuantity: 800, minOrderQuantity: 5,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 2180,
        harvestDate: '2025-11-20' as any, expiryDate: '2026-11-20' as any,
      },
      {
        sellerId: S, sellerType: 'supplier' as any, categoryId: GAO,
        name: 'Nếp cái hoa vàng Hải Dương',
        description: 'Nếp cái hoa vàng đặc sản đồng bằng sông Hồng, hạt trắng trong, dẻo thơm đặc biệt. Dùng làm xôi, bánh chưng, rượu nếp truyền thống.',
        pricePerUnit: 35000, unit: 'kg' as any, availableQuantity: 1500, minOrderQuantity: 20,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 873,
        harvestDate: '2025-12-01' as any, expiryDate: '2026-12-01' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: GAO,
        name: 'Gạo lứt đỏ hữu cơ An Giang',
        description: 'Gạo lứt đỏ hữu cơ An Giang, còn nguyên cám đỏ giàu chất xơ và vitamin B. Phù hợp người ăn kiêng, tiểu đường, muốn kiểm soát cân nặng.',
        pricePerUnit: 32000, unit: 'kg' as any, availableQuantity: 600, minOrderQuantity: 5,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 1450,
        harvestDate: '2026-04-15' as any, expiryDate: '2027-04-15' as any,
      },

      // ── Cà phê & chè ──────────────────────────────────────────
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: CF,
        name: 'Cà phê Arabica Cầu Đất Đà Lạt',
        description: 'Cà phê Arabica trồng tại vùng Cầu Đất 1500m so mực nước biển. Hữu cơ 100%, rang mộc theo phương pháp truyền thống. Hương thơm fruity, vị chua thanh cân bằng.',
        pricePerUnit: 120000, unit: 'kg' as any, availableQuantity: 150, minOrderQuantity: 2,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 764,
        harvestDate: '2025-12-01' as any, expiryDate: '2026-12-01' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: CF,
        name: 'Cà phê Robusta Buôn Ma Thuột',
        description: 'Cà phê Robusta nguyên bản từ Buôn Ma Thuột – thủ phủ cà phê Tây Nguyên. Hạt to đều, rang đậm, vị đắng mạnh, hậu vị ngọt lâu. Chứng nhận UTZ.',
        pricePerUnit: 75000, unit: 'kg' as any, availableQuantity: 500, minOrderQuantity: 5,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 2890,
        harvestDate: '2025-12-15' as any, expiryDate: '2026-12-15' as any,
      },
      {
        sellerId: S, sellerType: 'supplier' as any, categoryId: CF,
        name: 'Chè Shan Tuyết Hà Giang',
        description: 'Chè Shan Tuyết cổ thụ trên đỉnh núi Hà Giang 1500m. Búp trắng phủ tuyết, vị ngọt hậu dài, thơm mát. Hữu cơ tự nhiên, không phân bón hóa học.',
        pricePerUnit: 280000, unit: 'kg' as any, availableQuantity: 80, minOrderQuantity: 1,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 3420,
        harvestDate: '2026-04-01' as any, expiryDate: '2027-04-01' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: CF,
        name: 'Chè xanh Thái Nguyên loại đặc',
        description: 'Chè xanh Tân Cương – Thái Nguyên, búp một tôm hai lá, hái thủ công. Nước xanh vàng trong, vị chát dịu, thơm mùi cốm. Hộp thiếc 500g.',
        pricePerUnit: 180000, unit: 'kg' as any, availableQuantity: 200, minOrderQuantity: 1,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1876,
        harvestDate: '2026-05-01' as any, expiryDate: '2027-05-01' as any,
      },

      // ── Thủy hải sản ──────────────────────────────────────────
      {
        sellerId: S, sellerType: 'supplier' as any, categoryId: TS,
        name: 'Tôm sú sạch đông lạnh Cà Mau',
        description: 'Tôm sú nuôi sinh thái tại Cà Mau, thịt chắc ngọt, không kháng sinh. Đóng gói đông lạnh IQF 1kg/túi. Đạt ASC và tiêu chuẩn xuất khẩu EU.',
        pricePerUnit: 185000, unit: 'kg' as any, availableQuantity: 2000, minOrderQuantity: 5,
        farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 4320,
        harvestDate: '2026-05-25' as any, expiryDate: '2026-11-25' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: TS,
        name: 'Cá tra phi lê đông lạnh An Giang',
        description: 'Cá tra phi lê nuôi tại An Giang theo quy trình ASC, không chất tăng trọng. Thịt trắng mịn, không mùi bùn, đạt tiêu chuẩn xuất khẩu Mỹ và EU.',
        pricePerUnit: 65000, unit: 'kg' as any, availableQuantity: 3000, minOrderQuantity: 10,
        farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 2105,
        harvestDate: '2026-05-20' as any, expiryDate: '2026-11-20' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: TS,
        name: 'Mực khô Phú Quốc',
        description: 'Mực ống đánh bắt tự nhiên tại vùng biển Phú Quốc, phơi khô một nắng truyền thống. Mực to đều, màu hồng nhạt tự nhiên, không chất tẩy trắng.',
        pricePerUnit: 320000, unit: 'kg' as any, availableQuantity: 100, minOrderQuantity: 1,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1678,
        harvestDate: '2026-04-20' as any, expiryDate: '2027-04-20' as any,
      },

      // ── Gia vị & thảo mộc ─────────────────────────────────────
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: GV,
        name: 'Tiêu đen Phú Quốc',
        description: 'Tiêu đen hạt to vùng Phú Quốc, được bảo hộ chỉ dẫn địa lý. Vị cay nồng đặc trưng, hương thơm mạnh. Hạt đều đẹp, không tạp chất. OCOP 5 sao.',
        pricePerUnit: 180000, unit: 'kg' as any, availableQuantity: 200, minOrderQuantity: 1,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 3210,
        harvestDate: '2026-03-01' as any, expiryDate: '2027-03-01' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: GV,
        name: 'Nghệ vàng hữu cơ Bình Định',
        description: 'Nghệ vàng hữu cơ trồng tại Bình Định, hàm lượng curcumin cao trên 5%. Sấy khô, xay mịn không pha trộn. Dùng nấu ăn, làm đẹp, hỗ trợ sức khỏe.',
        pricePerUnit: 95000, unit: 'kg' as any, availableQuantity: 300, minOrderQuantity: 1,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 2140,
        harvestDate: '2026-02-15' as any, expiryDate: '2027-02-15' as any,
      },
      {
        sellerId: S, sellerType: 'supplier' as any, categoryId: GV,
        name: 'Tỏi đen Lý Sơn lên men tự nhiên',
        description: 'Tỏi đen lên men từ tỏi Lý Sơn nguyên củ. Vị ngọt nhẹ, không cay, thơm mùi balsamic. Giàu S-allyl cysteine gấp 10 lần tỏi tươi. Hộp 200g.',
        pricePerUnit: 350000, unit: 'kg' as any, availableQuantity: 50, minOrderQuantity: 1,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 4890,
        harvestDate: '2026-05-01' as any, expiryDate: '2026-11-01' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: GV,
        name: 'Gừng tươi hữu cơ Kỳ Sơn',
        description: 'Gừng tươi hữu cơ trồng trên núi Kỳ Sơn – Nghệ An 800m, củ già chắc, tinh dầu nhiều, vị cay nồng đậm đặc. Không bảo quản hóa chất.',
        pricePerUnit: 45000, unit: 'kg' as any, availableQuantity: 400, minOrderQuantity: 5,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 1320,
        harvestDate: '2026-04-20' as any, expiryDate: '2026-07-20' as any,
      },

      // ── Mật ong & đặc sản ─────────────────────────────────────
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: MO,
        name: 'Mật ong hoa nhãn nguyên chất',
        description: 'Mật ong hoa nhãn từ đàn ong nuôi tại vườn nhãn Hưng Yên. Màu vàng amber, sánh đặc, vị ngọt thơm hoa nhãn. Không pha đường, độ ẩm dưới 18%.',
        pricePerUnit: 180000, unit: 'liter' as any, availableQuantity: 200, minOrderQuantity: 1,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 2670,
        harvestDate: '2026-07-01' as any, expiryDate: '2027-07-01' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: MO,
        name: 'Mật ong rừng Tây Nguyên',
        description: 'Mật ong rừng nguyên khai thu từ tổ ong trên cây cổ thụ Tây Nguyên. Màu nâu đậm, vị đậm đà phức hợp nhiều loại hoa rừng. Kháng khuẩn tự nhiên cao.',
        pricePerUnit: 350000, unit: 'liter' as any, availableQuantity: 80, minOrderQuantity: 1,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 5120,
        harvestDate: '2026-03-15' as any, expiryDate: '2027-03-15' as any,
      },
      {
        sellerId: S, sellerType: 'supplier' as any, categoryId: MO,
        name: 'Muối hầm Cần Giờ',
        description: 'Muối hầm thủ công tại cánh đồng muối Cần Giờ TP.HCM. Muối trắng to hạt, độ mặn cao, giàu khoáng chất tự nhiên. Phơi nắng 3 ngày, không tẩy trắng.',
        pricePerUnit: 8000, unit: 'kg' as any, availableQuantity: 10000, minOrderQuantity: 50,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 543,
        harvestDate: '2026-04-01' as any, expiryDate: '2028-04-01' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: MO,
        name: 'Dừa xiêm xanh Bến Tre',
        description: 'Dừa xiêm xanh Bến Tre, trái non 6–8 tháng, nước nhiều ngọt lạnh, cơm mỏng mềm. Thu hoạch tươi, giao trong 24h. Lý tưởng cho quán nước, nhà hàng.',
        pricePerUnit: 15000, unit: 'piece' as any, availableQuantity: 5000, minOrderQuantity: 50,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1234,
        harvestDate: '2026-06-01' as any, expiryDate: '2026-06-15' as any,
      },
      {
        sellerId: S, sellerType: 'supplier' as any, categoryId: MO,
        name: 'Mắm nêm thùng Phan Thiết',
        description: 'Mắm nêm cá cơm ủ 12 tháng theo công thức truyền thống Phan Thiết. Màu nâu đỏ đẹp, mùi thơm đặc trưng, vị mặn ngọt hài hòa. Không chất bảo quản.',
        pricePerUnit: 45000, unit: 'liter' as any, availableQuantity: 300, minOrderQuantity: 2,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1102,
        harvestDate: '2026-01-01' as any, expiryDate: '2026-07-01' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: MO,
        name: 'Nước mắm cốt nhĩ Phú Quốc 40 độ đạm',
        description: 'Nước mắm cốt nhĩ Phú Quốc chắt lọc đầu tiên, 40 độ đạm. Màu nâu cánh gián đẹp, mùi thơm dịu, vị mặn ngọt hài hòa đặc trưng. Được bảo hộ GI EU.',
        pricePerUnit: 120000, unit: 'liter' as any, availableQuantity: 500, minOrderQuantity: 2,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 4230,
        harvestDate: '2026-01-01' as any, expiryDate: '2027-01-01' as any,
      },
      {
        sellerId: S, sellerType: 'supplier' as any, categoryId: MO,
        name: 'Dầu dừa nguyên chất ép lạnh',
        description: 'Dầu dừa VCO (virgin coconut oil) ép lạnh từ dừa tươi Bến Tre. Mùi dừa nhẹ, trong suốt, điểm nóng 175°C. Dùng nấu ăn, làm đẹp, dưỡng tóc da.',
        pricePerUnit: 180000, unit: 'liter' as any, availableQuantity: 300, minOrderQuantity: 1,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 3870,
        harvestDate: '2026-05-01' as any, expiryDate: '2027-05-01' as any,
      },
      {
        sellerId: S, sellerType: 'supplier' as any, categoryId: MO,
        name: 'Cao sâm Ngọc Linh cô đặc',
        description: 'Cao sâm Ngọc Linh chiết xuất cô đặc, nguồn sâm trồng tại vùng Ngọc Linh Quảng Nam 1500m. Hàm lượng ginsenoside MR2 cao, hỗ trợ sức khỏe tim mạch.',
        pricePerUnit: 8500000, unit: 'kg' as any, availableQuantity: 5, minOrderQuantity: 1,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 9876,
        harvestDate: '2026-02-01' as any, expiryDate: '2028-02-01' as any,
      },

      // ── Hạt & đậu ─────────────────────────────────────────────
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: HD,
        name: 'Hạt điều rang muối W320',
        description: 'Hạt điều rang muối W320 từ vùng điều Bình Phước, hạt to đều, không vỡ mảnh. Rang giòn, vị mặn nhẹ, thơm bơ tự nhiên. Túi hút chân không 500g.',
        pricePerUnit: 180000, unit: 'kg' as any, availableQuantity: 500, minOrderQuantity: 2,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 3456,
        harvestDate: '2026-03-01' as any, expiryDate: '2026-09-01' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: HD,
        name: 'Đậu phộng đỏ Bình Định',
        description: 'Đậu phộng đỏ (lạc đỏ) trồng tại Bình Định, hạt to đều, vỏ đỏ bóng đặc trưng. Hàm lượng dầu cao 45%. Dùng rang, làm tương, ép dầu lạc nguyên chất.',
        pricePerUnit: 35000, unit: 'kg' as any, availableQuantity: 1200, minOrderQuantity: 10,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 867,
        harvestDate: '2026-05-01' as any, expiryDate: '2026-11-01' as any,
      },

      // ── Nấm & rau sạch cao cấp (→ Rau củ quả) ────────────────
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: RAU,
        name: 'Nấm linh chi đỏ hữu cơ',
        description: 'Nấm linh chi đỏ trồng trong nhà lưới tại Đà Lạt, bào tử nhiều. Thái lát sấy khô, hàm lượng polysaccharide cao. Dùng sắc nước uống, hỗ trợ miễn dịch.',
        pricePerUnit: 650000, unit: 'kg' as any, availableQuantity: 50, minOrderQuantity: 1,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 2234,
        harvestDate: '2026-05-15' as any, expiryDate: '2027-05-15' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: RAU,
        name: 'Nấm đông cô tươi Lâm Đồng',
        description: 'Nấm đông cô (shiitake) tươi trồng trên mùn cưa sồi tại Đà Lạt. Mũ nấm dày, nâu đậm, mùi thơm đặc trưng. Hái sáng giao chiều, đảm bảo tươi ngon.',
        pricePerUnit: 80000, unit: 'kg' as any, availableQuantity: 200, minOrderQuantity: 2,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 1890,
        harvestDate: '2026-06-01' as any, expiryDate: '2026-06-08' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: RAU,
        name: 'Rau xà lách thủy canh Hà Nội',
        description: 'Xà lách romano thuỷ canh không đất tại Hà Nội. Lá xanh tươi giòn, không thuốc, không chì. Hệ thống NFT khép kín, kiểm soát dinh dưỡng hoàn toàn.',
        pricePerUnit: 42000, unit: 'kg' as any, availableQuantity: 100, minOrderQuantity: 1,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 678,
        harvestDate: '2026-06-03' as any, expiryDate: '2026-06-07' as any,
      },

      // ── Trái cây phía Bắc ─────────────────────────────────────
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: TC,
        name: 'Đào tiên Mộc Châu',
        description: 'Đào tiên Mộc Châu – Sơn La, trái to tròn, vỏ vàng ửng đỏ, thịt vàng ngọt thơm. Trồng ở độ cao 1000m, khí hậu mát mẻ giúp đào mọng nước hơn.',
        pricePerUnit: 60000, unit: 'kg' as any, availableQuantity: 350, minOrderQuantity: 5,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 1432,
        harvestDate: '2026-07-10' as any, expiryDate: '2026-07-20' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: TC,
        name: 'Mận hậu Bắc Hà Lào Cai',
        description: 'Mận hậu Bắc Hà chín muộn tháng 6–7, quả to đồng đều, vỏ tím mỡ màng, ruột vàng giòn ngọt. Đặc sản vùng cao được khách du lịch săn đón hàng năm.',
        pricePerUnit: 38000, unit: 'kg' as any, availableQuantity: 600, minOrderQuantity: 5,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 2100,
        harvestDate: '2026-07-05' as any, expiryDate: '2026-07-15' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: TC,
        name: 'Lê VH6 Bắc Giang',
        description: 'Lê VH6 lai tạo tại Bắc Giang, quả to hình quả lê cổ điển, vỏ vàng xanh, cùi giòn nhiều nước, vị ngọt thanh. Ít hạt, bảo quản được 2–3 tuần.',
        pricePerUnit: 48000, unit: 'kg' as any, availableQuantity: 400, minOrderQuantity: 5,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 543,
        harvestDate: '2026-08-15' as any, expiryDate: '2026-09-05' as any,
      },

      // ── Gia vị chế biến ───────────────────────────────────────
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: GV,
        name: 'Tinh bột nghệ sạch Bình Định',
        description: 'Tinh bột nghệ hữu cơ 100% chiết xuất từ nghệ vàng tươi Bình Định. Màu vàng tươi đẹp, mịn mượt, curcumin nguyên vẹn. Hòa sữa, nấu ăn, đắp mặt nạ.',
        pricePerUnit: 250000, unit: 'kg' as any, availableQuantity: 100, minOrderQuantity: 1,
        farmingType: 'organic' as any, status: 'active' as any, viewCount: 2890,
        harvestDate: '2026-04-01' as any, expiryDate: '2027-04-01' as any,
      },

      // ── Hoa & cây cảnh ────────────────────────────────────────
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: HOA,
        name: 'Hoa cúc vàng Đà Lạt',
        description: 'Hoa cúc vàng tươi cắt cành từ trang trại Đà Lạt, mỗi bó 20 cành. Hoa nở đẹp, cánh dày, màu vàng tươi. Đóng gói cẩn thận, giao 24h.',
        pricePerUnit: 45000, unit: 'bunch' as any, availableQuantity: 500, minOrderQuantity: 5,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 1120,
        harvestDate: '2026-06-05' as any, expiryDate: '2026-06-12' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: HOA,
        name: 'Hoa hồng nhập khẩu Ecuador',
        description: 'Hoa hồng Ecuador thân dài 60–70cm, bông to đẹp 5–6cm, màu sắc đa dạng. Trồng trên cao nguyên 3000m, độ bền 10–14 ngày. Đặt trước 3 ngày.',
        pricePerUnit: 85000, unit: 'bunch' as any, availableQuantity: 200, minOrderQuantity: 2,
        farmingType: 'globalgap' as any, status: 'active' as any, viewCount: 2340,
        harvestDate: '2026-06-07' as any, expiryDate: '2026-06-21' as any,
      },

      // ── Gia súc & gia cầm ─────────────────────────────────────
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: GS,
        name: 'Trứng gà ta thả vườn Đồng Nai',
        description: 'Trứng gà ta thả vườn nuôi bằng thức ăn ngũ cốc tự nhiên tại Đồng Nai. Vỏ nâu sần, lòng đỏ đậm màu cam, hàm lượng omega-3 cao hơn gà công nghiệp.',
        pricePerUnit: 65000, unit: 'box' as any, availableQuantity: 1000, minOrderQuantity: 5,
        farmingType: 'traditional' as any, status: 'active' as any, viewCount: 3456,
        harvestDate: '2026-06-04' as any, expiryDate: '2026-07-04' as any,
      },
      {
        sellerId: C, sellerType: 'cooperative' as any, categoryId: GS,
        name: 'Thịt bò Wagyu F1 Lâm Đồng',
        description: 'Thịt bò Wagyu F1 nuôi tại trang trại Lâm Đồng, vân mỡ đẹp (marbling score 4–6). Cỏ tươi kết hợp ngũ cốc, không hormone tăng trưởng. Đóng túi chân không.',
        pricePerUnit: 650000, unit: 'kg' as any, availableQuantity: 100, minOrderQuantity: 1,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 5670,
        harvestDate: '2026-06-01' as any, expiryDate: '2026-06-15' as any,
      },
      {
        sellerId: F, sellerType: 'farmer' as any, categoryId: GS,
        name: 'Sữa bò tươi nguyên liệu Mộc Châu',
        description: 'Sữa bò tươi nguyên liệu từ trang trại bò sữa Mộc Châu, độ béo 3.6%, protein 3.2%. Thanh trùng nhiệt độ thấp, bảo quản lạnh 4°C. Giao trong 24h.',
        pricePerUnit: 22000, unit: 'liter' as any, availableQuantity: 500, minOrderQuantity: 5,
        farmingType: 'vietgap' as any, status: 'active' as any, viewCount: 1890,
        harvestDate: '2026-06-04' as any, expiryDate: '2026-06-11' as any,
      },
    ];

    const saved = await this.productRepo.save(
      mockProducts.map((p) => this.productRepo.create(p)),
    );

    // Ảnh Unsplash theo danh mục sản phẩm
    const imageMap: Record<string, string> = {
      'Xoài cát Hòa Lộc loại 1':          'https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=600&q=80',
      'Thanh long ruột đỏ xuất khẩu':      'https://images.unsplash.com/photo-1507908708918-778587c9e563?w=600&q=80',
      'Sầu riêng Ri6 Cai Lậy':             'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=600&q=80',
      'Bưởi da xanh Bến Tre':              'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=600&q=80',
      'Dưa hấu không hạt Long An':         'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=600&q=80',
      'Nhãn lồng Hưng Yên':                'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=600&q=80',
      'Vải thiều Lục Ngạn Bắc Giang':      'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=600&q=80',
      'Cam sành Hà Giang':                 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?w=600&q=80',
      'Dứa MD2 Ninh Bình':                 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&q=80',
      'Ổi lê Đài Loan không hạt':          'https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=600&q=80',
      'Rau muống hữu cơ Đà Lạt':           'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&q=80',
      'Rau cải bắp VietGAP Lâm Đồng':      'https://images.unsplash.com/photo-1612257416648-c7f230d0c5d2?w=600&q=80',
      'Cà chua bi hữu cơ Đà Lạt':          'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=600&q=80',
      'Khoai lang tím Nhật Vĩnh Long':     'https://images.unsplash.com/photo-1596097634977-df35c2b0e77a?w=600&q=80',
      'Bí đỏ Hokaido Gia Lai':             'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=600&q=80',
      'Hành tím Vĩnh Châu Sóc Trăng':      'https://images.unsplash.com/photo-1508747703725-719777637510?w=600&q=80',
      'Măng tây xanh Ninh Thuận':          'https://images.unsplash.com/photo-1602910344008-22f323cc1817?w=600&q=80',
      'Gạo ST25 đặc sản Sóc Trăng':        'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80',
      'Gạo hữu cơ Séng Cù Mường Khương':  'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=600&q=80',
      'Nếp cái hoa vàng Hải Dương':        'https://images.unsplash.com/photo-1627485937980-221c88ac04f9?w=600&q=80',
      'Gạo lứt đỏ hữu cơ An Giang':        'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&q=80',
      'Cà phê Arabica Cầu Đất Đà Lạt':     'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=600&q=80',
      'Cà phê Robusta Buôn Ma Thuột':       'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&q=80',
      'Chè Shan Tuyết Hà Giang':           'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=80',
      'Chè xanh Thái Nguyên loại đặc':     'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
      'Tôm sú sạch đông lạnh Cà Mau':      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=80',
      'Cá tra phi lê đông lạnh An Giang':  'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=600&q=80',
      'Mực khô Phú Quốc':                  'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80',
      'Tiêu đen Phú Quốc':                 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
      'Nghệ vàng hữu cơ Bình Định':        'https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=600&q=80',
      'Tỏi đen Lý Sơn lên men tự nhiên':   'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=600&q=80',
      'Gừng tươi hữu cơ Kỳ Sơn':          'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&q=80',
      'Mật ong hoa nhãn nguyên chất':       'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80',
      'Mật ong rừng Tây Nguyên':            'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&q=80',
      'Muối hầm Cần Giờ':                  'https://images.unsplash.com/photo-1569530143516-d9b6bd08ed51?w=600&q=80',
      'Dừa xiêm xanh Bến Tre':             'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
      'Hạt điều rang muối W320':           'https://images.unsplash.com/photo-1561043433-aaf687c4cf04?w=600&q=80',
      'Đậu phộng đỏ Bình Định':            'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80',
      'Mắm nêm thùng Phan Thiết':          'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&q=80',
      'Nấm linh chi đỏ hữu cơ':            'https://images.unsplash.com/photo-1611171711792-0e7e5ee6a2e7?w=600&q=80',
      'Nấm đông cô tươi Lâm Đồng':         'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
      'Rau xà lách thủy canh Hà Nội':      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
      'Đào tiên Mộc Châu':                 'https://images.unsplash.com/photo-1595475038665-b70d5f4f43b4?w=600&q=80',
      'Mận hậu Bắc Hà Lào Cai':            'https://images.unsplash.com/photo-1539833414579-85b329ec6a9a?w=600&q=80',
      'Lê VH6 Bắc Giang':                 'https://images.unsplash.com/photo-1621274219541-a3cdc8ab23af?w=600&q=80',
      'Dầu dừa nguyên chất ép lạnh':       'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80',
      'Nước mắm cốt nhĩ Phú Quốc 40 độ đạm': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80',
      'Tinh bột nghệ sạch Bình Định':      'https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?w=600&q=80',
      'Cao sâm Ngọc Linh cô đặc':          'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600&q=80',
      'Hoa cúc vàng Đà Lạt':               'https://images.unsplash.com/photo-1490750967868-88df5691cc34?w=600&q=80',
      'Hoa hồng nhập khẩu Ecuador':        'https://images.unsplash.com/photo-1559181567-c3190ebb3c2f?w=600&q=80',
      'Trứng gà ta thả vườn Đồng Nai':     'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&q=80',
      'Thịt bò Wagyu F1 Lâm Đồng':         'https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80',
      'Sữa bò tươi nguyên liệu Mộc Châu':  'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80',
    };

    const FALLBACK = 'https://images.unsplash.com/photo-1506617420156-8e4536971650?w=600&q=80';

    await this.imageRepo.save(
      saved.map((p) =>
        this.imageRepo.create({
          productId: p.id,
          imageUrl: imageMap[p.name] ?? FALLBACK,
          isPrimary: true,
          sortOrder: 0,
        }),
      ),
    );

    // Thêm chứng nhận cho một số sản phẩm
    const certTargets = [
      { name: 'Thanh long ruột đỏ xuất khẩu',    certType: 'globalgap', certNumber: 'GG-2024-BT-001', issuedBy: 'Control Union', issuedDate: '2024-01-15', expiryDate: '2026-01-15' },
      { name: 'Gạo ST25 đặc sản Sóc Trăng',       certType: 'vietgap',   certNumber: 'VG-2024-ST-089', issuedBy: 'Quatest 3',      issuedDate: '2024-03-01', expiryDate: '2026-03-01' },
      { name: 'Vải thiều Lục Ngạn Bắc Giang',     certType: 'globalgap', certNumber: 'GG-2024-BG-044', issuedBy: 'SGS Vietnam',   issuedDate: '2024-04-01', expiryDate: '2026-04-01' },
      { name: 'Cà phê Arabica Cầu Đất Đà Lạt',    certType: 'organic',   certNumber: 'ORG-2024-DL-012', issuedBy: 'IFOAM Vietnam', issuedDate: '2024-02-20', expiryDate: '2026-02-20' },
      { name: 'Gạo hữu cơ Séng Cù Mường Khương', certType: 'organic',   certNumber: 'JAS-2024-LC-003', issuedBy: 'ECOCERT Japan', issuedDate: '2024-06-01', expiryDate: '2026-06-01' },
      { name: 'Tiêu đen Phú Quốc',                certType: 'ocop',      certNumber: 'OCOP-5S-PQ-2024', issuedBy: 'Bộ NN&PTNT',   issuedDate: '2024-01-01', expiryDate: '2026-01-01' },
      { name: 'Tôm sú sạch đông lạnh Cà Mau',     certType: 'globalgap', certNumber: 'ASC-2024-CM-007', issuedBy: 'Bureau Veritas', issuedDate: '2024-05-10', expiryDate: '2026-05-10' },
      { name: 'Nước mắm cốt nhĩ Phú Quốc 40 độ đạm', certType: 'other', certNumber: 'GI-EU-PQ-2023', issuedBy: 'EU Commission', issuedDate: '2023-12-01', expiryDate: '2028-12-01' },
      { name: 'Sầu riêng Ri6 Cai Lậy',            certType: 'vietgap',   certNumber: 'VG-2024-TG-156', issuedBy: 'Quatest 3',     issuedDate: '2024-04-15', expiryDate: '2026-04-15' },
      { name: 'Mật ong rừng Tây Nguyên',           certType: 'organic',   certNumber: 'ORG-2024-TN-028', issuedBy: 'IFOAM Vietnam', issuedDate: '2024-03-10', expiryDate: '2026-03-10' },
    ] as const;

    const savedMap = new Map(saved.map((p) => [p.name, p.id]));
    const certInserts = certTargets
      .map(({ name, certType, certNumber, issuedBy, issuedDate, expiryDate }) => {
        const productId = savedMap.get(name);
        if (!productId) return null;
        return this.certRepo.create({ productId, certType: certType as any, certNumber, issuedBy, issuedDate: issuedDate as any, expiryDate: expiryDate as any });
      })
      .filter(Boolean);

    if (certInserts.length > 0) {
      await this.certRepo.save(certInserts);
    }

    return { seeded: saved.length, skipped: 0 };
  }

  async findCategories(): Promise<ProductCategory[]> {
    return this.categoryRepo.find({
      where: { parentId: null, isActive: true },
      order: { sortOrder: 'ASC' },
    });
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
}