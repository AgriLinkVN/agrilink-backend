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
}