import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User } from '../modules/users/infrastructure/persistence/entities/user.entity';
import { FarmerProfile } from './entities/farmer-profile.entity';
import { CooperativeProfile } from './entities/cooperative-profile.entity';
import { EnterpriseProfile } from './entities/enterprise-profile.entity';
import { SupplierProfile } from './entities/supplier-profile.entity';
import { LogisticsProfile } from './entities/logistics-profile.entity';
import { Product } from '../modules/products/infrastructure/persistence/entities/product.entity';
import { ProductImage } from '../modules/products/infrastructure/persistence/entities/product-image.entity';
import { ProductCategory } from '../modules/products/infrastructure/persistence/entities/product-category.entity';
import { ProductCertification } from '../modules/products/infrastructure/persistence/entities/product-certification.entity';
import { Wishlist } from '../modules/products/infrastructure/persistence/entities/wishlist.entity';
import { Review } from '../modules/reviews/infrastructure/persistence/entities/review.entity';
import { ForumPost } from '../modules/forum/entities/forum-post.entity';
import { ForumComment } from '../modules/forum/entities/forum-comment.entity';
import { ForumLike } from '../modules/forum/entities/forum-like.entity';
import { AdCampaign } from '../modules/ads/infrastructure/persistence/entities/ad-campaign.entity';
import { AdPackage } from '../modules/ads/infrastructure/persistence/entities/ad-package.entity';
import { CooperativeMemberEntity } from '../modules/cooperatives/infrastructure/persistence/entities/cooperative-member.entity';
import { BulkListingEntity } from '../modules/cooperatives/infrastructure/persistence/entities/bulk-listing.entity';
import { BulkListingContributionEntity } from '../modules/cooperatives/infrastructure/persistence/entities/bulk-listing-contribution.entity';
import { HarvestScheduleEntity } from '../modules/cooperatives/infrastructure/persistence/entities/harvest-schedule.entity';
import { AuditLog } from '../modules/admin/entities/audit-log.entity';
import { NotificationOrmEntity } from '../modules/notifications/infrastructure/persistence/notification.orm-entity';

import {
  UserRole, UserStatus, FarmingType, ProductUnit, ProductStatus,
  SellerType, CertType, CertificationStatus,
  AdType, AdStatus, SupplierType, NotifType,
} from '../common/enums';
import { ForumCategory } from '../modules/forum/entities/forum-post.entity';

@Injectable()
export class DevSeedService {
  private readonly logger = new Logger(DevSeedService.name);
  private readonly PASSWORD = 'Test@1234';
  private passwordHash: string;

  constructor(@InjectDataSource() private readonly ds: DataSource) {
    this.passwordHash = bcrypt.hashSync(this.PASSWORD, bcrypt.genSaltSync(10));
  }

  async seedAll(options: { reset?: boolean } = {}): Promise<void> {
    if (options.reset) {
      await this.resetAll();
    }
    const log = this.logger;

    // ── 1. Users (must be first) ──────────────────────────────
    const users = await this.seedUsers();
    const { ADMIN, FARMER, BUYER, ENTERPRISE, SUPPLIER, LOGISTICS, COOP, STATE_AGENCY } = users;
    log.log(`[Seed] ${Object.keys(users).length} users ready`);

    // ── 2. Addresses + Profiles + KYC ─────────────────────────
    await this.seedAddress(ADMIN.id, 'Viện Quy hoạch, 65 Văn Miếu, Đống Đa', 1);
    await this.seedAddress(FARMER.id, 'Thôn 3, xã Lạc Dương, Lâm Đồng', 2);
    await this.seedAddress(BUYER.id, '123 Nguyễn Huệ, Quận 1, TP.HCM', 3);
    await this.seedAddress(ENTERPRISE.id, 'Lô B4, Khu CN Thăng Long, Hà Nội', 1);
    await this.seedAddress(SUPPLIER.id, 'KM5, Quốc lộ 14, Buôn Ma Thuột', 10);
    await this.seedAddress(LOGISTICS.id, '456 Lê Lợi, Hải Châu, Đà Nẵng', 6);
    await this.seedAddress(COOP.id, 'Ấp Mỹ Hòa, xã Mỹ Phong, Tiền Giang', 22);
    await this.seedAddress(STATE_AGENCY.id, '16 Ngô Quyền, Hoàn Kiếm, Hà Nội', 1);
    log.log(`[Seed] addresses seeded`);

    await this.seedProfile(FARMER, 'farmer');
    await this.seedProfile(COOP, 'cooperative');
    await this.seedProfile(ENTERPRISE, 'enterprise');
    await this.seedProfile(SUPPLIER, 'supplier');
    await this.seedProfile(LOGISTICS, 'logistics');
    log.log(`[Seed] role profiles + KYC seeded`);

    // ── 3. Product categories + Products + Images ──────────────
    // categories seeded by ProductDevelopmentSeedService - just products
    const products = await this.seedProducts();
    log.log(`[Seed] ${products.length} demo products seeded`);

    // ── 4. Forum ──────────────────────────────────────────────
    const posts = await this.seedForum(FARMER.id, COOP.id, BUYER.id, products);
    log.log(`[Seed] ${posts.length} forum posts seeded`);

    // ── 5. Reviews ────────────────────────────────────────────
    const reviews = await this.seedReviews(FARMER.id, COOP.id, BUYER.id, ENTERPRISE.id, products);
    log.log(`[Seed] ${reviews.length} reviews seeded`);

    // ── 6. Ads ────────────────────────────────────────────────
    await this.seedAdPackages();
    await this.seedAdCampaigns(SUPPLIER.id, ADMIN.id);
    log.log(`[Seed] ads seeded`);

    // ── 7. Cooperative data ───────────────────────────────────
    const members = await this.seedCoopMembers(COOP.id, FARMER.id);
    await this.seedBulkListings(COOP.id, FARMER.id, products);
    await this.seedHarvestSchedules(COOP.id, FARMER.id, products[0].id);
    log.log(`[Seed] cooperative data seeded (${members} members)`);

    // ── 8. Suspended products (for state_agency dashboard) ────
    await this.seedViolations(products[products.length - 1].id, ADMIN.id);
    log.log(`[Seed] violations seeded`);

    // ── 9. Audit logs ─────────────────────────────────────────
    await this.seedAuditLogs(ADMIN.id, STATE_AGENCY.id);
    log.log(`[Seed] audit logs seeded`);

    // ── 10. Notifications ─────────────────────────────────────
    await this.seedNotifications(users);
    log.log(`[Seed] notifications seeded`);

    log.log('═══════════════════════════════════════════');
    log.log(`[Seed] ALL DEMO DATA SEEDED SUCCESSFULLY`);
    log.log(`[Seed] Login password for all: ${this.PASSWORD}`);
    for (const [key, u] of Object.entries(users)) {
      log.log(`[Seed]   ${key.padEnd(15)} ${u.phone.padEnd(15)} ${u.fullName}`);
    }
    log.log('═══════════════════════════════════════════');
  }

  private async resetAll(): Promise<void> {
    const tables = [
      'harvest_schedules', 'bulk_listing_contributions', 'bulk_listings',
      'cooperative_members', 'forum_likes', 'forum_comments', 'forum_posts',
      'review',
      'ad_campaigns', 'ad_packages', 'ad_events',
      'product_certifications', 'product_images', 'products',
      'product_categories',
      'farmer_profiles', 'cooperative_profiles', 'enterprise_profiles',
      'supplier_profiles', 'logistics_profiles',
      'user_addresses', 'notifications', 'audit_logs',
    ];
    for (const t of tables) {
      try { await this.ds.query(`DELETE FROM "${t}"`); } catch { /* skip non-existent */ }
    }
    // Keep users (re-seed below)
    await this.ds.query(`DELETE FROM "users"`);
    this.logger.log('[Seed] All tables reset');
  }

  // ── USERS ────────────────────────────────────────────────────────────
  private async seedUsers() {
    const repo = this.ds.getRepository(User);
    const ph = this.passwordHash;
    const data = [
      { phone: '+84905064606', email: 'admin@agrilink.vn', role: UserRole.ADMIN, status: UserStatus.ACTIVE, fullName: 'Admin Hệ thống AgriLink', isPhoneVerified: true, isEmailVerified: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AD' },
      { phone: '+84905602427', email: 'farmer@sandbox.com', role: UserRole.FARMER, status: UserStatus.ACTIVE, fullName: 'Nguyễn Văn Nông', isPhoneVerified: true, isEmailVerified: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=NVN' },
      { phone: '+84909259456', email: 'buyer@sandbox.com', role: UserRole.BUYER, status: UserStatus.ACTIVE, fullName: 'Trần Thị Thu Mua', isPhoneVerified: true, isEmailVerified: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=TTM' },
      { phone: '+84902136212', email: 'enterprise@sandbox.com', role: UserRole.ENTERPRISE, status: UserStatus.ACTIVE, fullName: 'Doanh nghiệp Nông sản Việt', isPhoneVerified: true, isEmailVerified: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=DNV' },
      { phone: '+84905516850', email: 'supplier@sandbox.com', role: UserRole.SUPPLIER, status: UserStatus.ACTIVE, fullName: 'Nhà cung cấp Vật tư An Dân', isPhoneVerified: true, isEmailVerified: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=NCC' },
      { phone: '+84903730212', email: 'logistics@sandbox.com', role: UserRole.LOGISTICS, status: UserStatus.ACTIVE, fullName: 'Logistics Giao hàng Nhanh', isPhoneVerified: true, isEmailVerified: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=GHN' },
      { phone: '+84902372975', email: 'cooperative@sandbox.com', role: UserRole.COOPERATIVE, status: UserStatus.ACTIVE, fullName: 'HTX Nông nghiệp Xanh Tiền Giang', isPhoneVerified: true, isEmailVerified: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=HTX' },
      { phone: '+84907658754', email: 'state_agency@sandbox.com', role: UserRole.STATE_AGENCY, status: UserStatus.ACTIVE, fullName: 'Cơ quan Quản lý NN Nông thôn', isPhoneVerified: true, isEmailVerified: true, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=SDA' },
      { phone: '+84909000001', email: 'demo.farmer@sandbox.com', role: UserRole.FARMER, status: UserStatus.ACTIVE, fullName: 'Nông dân Demo Lâm Đồng', isPhoneVerified: true, isEmailVerified: true },
      { phone: '+84909000002', email: 'demo.coop@sandbox.com', role: UserRole.COOPERATIVE, status: UserStatus.ACTIVE, fullName: 'HTX Demo Tiền Giang', isPhoneVerified: true, isEmailVerified: true },
      { phone: '+84909000003', email: 'demo.supplier@sandbox.com', role: UserRole.SUPPLIER, status: UserStatus.ACTIVE, fullName: 'Nhà cung cấp Demo Đắk Lắk', isPhoneVerified: true, isEmailVerified: true },
    ];

    const result: Record<string, User> = {};
    const keys = ['ADMIN', 'FARMER', 'BUYER', 'ENTERPRISE', 'SUPPLIER', 'LOGISTICS', 'COOP', 'STATE_AGENCY'];
    for (let i = 0; i < keys.length; i++) {
      const existing = await repo.findOne({ where: { phone: data[i].phone } });
      if (existing) {
        await repo.update(existing.id, { passwordHash: ph });
        result[keys[i]] = existing;
      } else {
        result[keys[i]] = await repo.save(repo.create({ ...data[i], passwordHash: ph }));
      }
    }
    // Demo seller users (index 8-10)
    for (let i = 8; i < data.length; i++) {
      const existing = await repo.findOne({ where: { phone: data[i].phone } });
      if (!existing) await repo.save(repo.create({ ...data[i], passwordHash: ph }));
    }
    return result as Record<string, User>;
  }

  // ── ADDRESSES ────────────────────────────────────────────────────────
  private async seedAddress(userId: string, addr: string, provinceId: number) {
    const existing = await this.ds.query(`SELECT id FROM user_addresses WHERE user_id = $1 LIMIT 1`, [userId]);
    if (existing.length === 0) {
      await this.ds.query(
        `INSERT INTO user_addresses (user_id, label, full_name, phone, address_line, province_id, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, 'Địa chỉ chính', addr, '', addr, provinceId, true],
      );
    }
  }

  // ── ROLE PROFILES ────────────────────────────────────────────────────
  private async seedProfile(user: User, type: string) {
    const now = new Date();
    switch (type) {
      case 'farmer': {
        const repo = this.ds.getRepository(FarmerProfile);
        const existing = await repo.findOne({ where: { user: { id: user.id } } });
        if (!existing) {
          await repo.save(repo.create({
            user,
            cccdNumber: '079201012345',
            cccdFrontUrl: 'https://placehold.co/600x400/E8F5E9/2E7D32?text=CCCD+Mat+truoc',
            cccdBackUrl: 'https://placehold.co/600x400/E8F5E9/2E7D32?text=CCCD+Mat+sau',
            residenceAddress: 'Thôn 3, xã Lạc Dương, Lâm Đồng',
            ward: 'Lạc Dương',
            isKycVerified: true,
            verifiedAt: now,
            bio: 'Nông dân sản xuất rau củ hữu cơ tại Lâm Đồng với hơn 10 năm kinh nghiệm. Diện tích canh tác 5ha.',
            trustScore: 4.8,
            totalSales: 156,
            provinceId: 2,
            districtId: null as any,
          }));
        }
        break;
      }
      case 'cooperative': {
        const repo = this.ds.getRepository(CooperativeProfile);
        const existing = await repo.findOne({ where: { user: { id: user.id } } });
        if (!existing) {
          await repo.save(repo.create({
            user,
            cooperativeName: user.fullName!,
            businessLicenseNumber: '1801234567',
            taxCode: '1801234567',
            cooperativeCertUrl: 'https://placehold.co/600x400/FFF3E0/E65100?text=Giay+phep+HTX',
            businessLicenseUrl: 'https://placehold.co/600x400/FFF3E0/E65100?text=DKKD+HTX',
            representativeName: 'Nguyễn Văn Xanh',
            representativePhone: '+84902372975',
            representativeCccd: '079201098765',
            representativeCccdFrontUrl: 'https://placehold.co/600x400/E3F2FD/1565C0?text=CCCD+Mat+truoc',
            representativeCccdBackUrl: 'https://placehold.co/600x400/E3F2FD/1565C0?text=CCCD+Mat+sau',
            membersListUrl: 'https://placehold.co/800x600/F5F5F5/424242?text=Danh+sach+thanh+vien',
            address: 'Ấp Mỹ Hòa, xã Mỹ Phong, Tiền Giang',
            provinceId: 22,
            totalMembers: 45,
            isVerified: true,
            verifiedBy: null,
            verifiedAt: now,
          }));
        }
        break;
      }
      case 'enterprise': {
        const repo = this.ds.getRepository(EnterpriseProfile);
        const existing = await repo.findOne({ where: { user: { id: user.id } } });
        if (!existing) {
          await repo.save(repo.create({
            user,
            companyName: user.fullName!,
            taxCode: '0101234568',
            businessLicenseUrl: 'https://placehold.co/600x400/E8F5E9/2E7D32?text=DKKD+Doanh+nghiep',
            representativeName: 'Trần Văn Doanh',
            representativePhone: '+84902136212',
            address: 'Lô B4, Khu CN Thăng Long, Hà Nội',
            provinceId: 1,
            industry: 'Chế biến nông sản',
            isVerified: true,
          }));
        }
        break;
      }
      case 'supplier': {
        const repo = this.ds.getRepository(SupplierProfile);
        const existing = await repo.findOne({ where: { userId: user.id } });
        if (!existing) {
          await repo.save(repo.create({
            userId: user.id,
            companyName: user.fullName!,
            taxCode: '4701234569',
            address: 'KM5, Quốc lộ 14, Buôn Ma Thuột',
            provinceId: 10,
            supplierType: SupplierType.MIXED,
            isVerified: true,
            businessLicenseUrl: 'https://placehold.co/600x400/FFF3E0/E65100?text=DKKD+NCC',
            verifiedBy: null,
          }));
        }
        break;
      }
      case 'logistics': {
        const repo = this.ds.getRepository(LogisticsProfile);
        const existing = await repo.findOne({ where: { userId: user.id } });
        if (!existing) {
          await repo.save(repo.create({
            userId: user.id,
            companyName: user.fullName!,
            vehicleTypes: ['Xe tải 5 tấn', 'Xe tải 10 tấn', 'Xe lạnh', 'Xe ba gác'],
            operatingProvinces: [1, 2, 6, 7, 22, 23, 24, 10, 11, 12],
            isVerified: true,
          }));
        }
        break;
      }
    }
  }

  // ── PRODUCTS ────────────────────────────────────────────────────────
  private async seedProducts(): Promise<Product[]> {
    const productRepo = this.ds.getRepository(Product);
    const imgRepo = this.ds.getRepository(ProductImage);
    const certRepo = this.ds.getRepository(ProductCertification);
    const categoryRepo = this.ds.getRepository(ProductCategory);

    const existingCount = await productRepo.count();
    if (existingCount > 0) return productRepo.find();

    // Get users for sellerId
    const users = await this.ds.getRepository(User).find();
    const farmer = users.find(u => u.role === UserRole.FARMER)!;
    const coop = users.find(u => u.role === UserRole.COOPERATIVE)!;
    const supplier = users.find(u => u.role === UserRole.SUPPLIER)!;

    // Ensure categories exist
    await this.seedCategories(categoryRepo);

    const cats = await categoryRepo.find();
    const catId = (slug: string): string | undefined => cats.find(c => c.slug === slug)?.id;

    const TC = catId('trai-cay');
    const RAU = catId('rau-cu-qua');
    const GAO = catId('lua-gao-ngu-coc');
    const CF = catId('ca-phe-che');
    const GV = catId('gia-vi-thao-moc');
    const HD = catId('hat-dau');
    const MO = catId('mat-ong-dac-san');
    const HOA = catId('hoa-cay-canh');

    const specs: { sellerId: string; sellerType: SellerType; categoryId?: string; name: string; description: string; pricePerUnit: number; unit: ProductUnit; availableQuantity: number; minOrderQuantity: number; farmingType: FarmingType; status: ProductStatus; viewCount: number; harvestDate: string; img: string }[] = [
      { sellerId: farmer.id, sellerType: SellerType.FARMER, categoryId: TC, name: 'Xoài cát Hòa Lộc', description: 'Xoài cát Hòa Lộc đặc sản Tiền Giang, ngọt thanh, ít xơ. VietGAP.', pricePerUnit: 45000, unit: ProductUnit.KG, availableQuantity: 500, minOrderQuantity: 10, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 1284, harvestDate: '2026-06-15', img: 'https://images.unsplash.com/photo-1605027990121-3b2c6940a0bf?w=600' },
      { sellerId: coop.id, sellerType: SellerType.COOPERATIVE, categoryId: TC, name: 'Sầu riêng Ri6', description: 'Sầu riêng Ri6 Cai Lậy, cơm vàng hạt lép, mùi thơm nồng.', pricePerUnit: 85000, unit: ProductUnit.KG, availableQuantity: 600, minOrderQuantity: 5, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 3250, harvestDate: '2026-07-15', img: 'https://images.unsplash.com/photo-1623691879411-c4a4d0bc3a6e?w=600' },
      { sellerId: farmer.id, sellerType: SellerType.FARMER, categoryId: TC, name: 'Bưởi da xanh Bến Tre', description: 'Bưởi da xanh ruột hồng, không hạt, mọng nước.', pricePerUnit: 32000, unit: ProductUnit.KG, availableQuantity: 800, minOrderQuantity: 10, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 1120, harvestDate: '2026-07-01', img: 'https://images.unsplash.com/photo-1576181256399-834e3b3a49bf?w=600' },
      { sellerId: coop.id, sellerType: SellerType.COOPERATIVE, categoryId: TC, name: 'Thanh long ruột đỏ', description: 'Thanh long ruột đỏ Bình Thuận xuất khẩu, GlobalGAP.', pricePerUnit: 35000, unit: ProductUnit.KG, availableQuantity: 1000, minOrderQuantity: 50, farmingType: FarmingType.GLOBALGAP, status: ProductStatus.ACTIVE, viewCount: 2105, harvestDate: '2026-06-20', img: 'https://images.unsplash.com/photo-1527325678286-6dade1d6c4ce?w=600' },
      { sellerId: farmer.id, sellerType: SellerType.FARMER, categoryId: TC, name: 'Dưa hấu không hạt', description: 'Dưa hấu không hạt Long An, ngọt sắc, vỏ mỏng.', pricePerUnit: 18000, unit: ProductUnit.KG, availableQuantity: 3000, minOrderQuantity: 30, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 987, harvestDate: '2026-06-10', img: 'https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=600' },
      { sellerId: supplier.id, sellerType: SellerType.SUPPLIER, categoryId: TC, name: 'Vải thiều Lục Ngạn', description: 'Vải thiều Lục Ngạn Bắc Giang, xuất khẩu 30 quốc gia.', pricePerUnit: 42000, unit: ProductUnit.KG, availableQuantity: 1500, minOrderQuantity: 20, farmingType: FarmingType.GLOBALGAP, status: ProductStatus.ACTIVE, viewCount: 4120, harvestDate: '2026-06-05', img: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600' },
      { sellerId: farmer.id, sellerType: SellerType.FARMER, categoryId: RAU, name: 'Rau muống hữu cơ Đà Lạt', description: 'Rau muống hữu cơ Đà Lạt, không thuốc trừ sâu.', pricePerUnit: 25000, unit: ProductUnit.KG, availableQuantity: 200, minOrderQuantity: 5, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 892, harvestDate: '2026-06-01', img: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600' },
      { sellerId: farmer.id, sellerType: SellerType.FARMER, categoryId: RAU, name: 'Cà rốt Đà Lạt', description: 'Cà rốt Đà Lạt ngọt giòn, VietGAP, tươi mỗi ngày.', pricePerUnit: 22000, unit: ProductUnit.KG, availableQuantity: 400, minOrderQuantity: 10, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 645, harvestDate: '2026-06-05', img: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600' },
      { sellerId: farmer.id, sellerType: SellerType.FARMER, categoryId: GAO, name: 'Gạo ST25 đặc sản', description: 'Gạo ST25 Sóc Trăng — gạo ngon nhất thế giới, VietGAP.', pricePerUnit: 28000, unit: ProductUnit.KG, availableQuantity: 2000, minOrderQuantity: 20, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 5432, harvestDate: '2026-05-30', img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600' },
      { sellerId: farmer.id, sellerType: SellerType.FARMER, categoryId: GAO, name: 'Gạo Jasmine thơm', description: 'Gạo Jasmine thơm dẻo Cần Thơ, truyền thống.', pricePerUnit: 24000, unit: ProductUnit.KG, availableQuantity: 1500, minOrderQuantity: 20, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 3210, harvestDate: '2026-04-20', img: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600' },
      { sellerId: farmer.id, sellerType: SellerType.FARMER, categoryId: CF, name: 'Cà phê Arabica Cầu Đất', description: 'Cà phê Arabica Cầu Đất 1500m, hữu cơ, rang mộc.', pricePerUnit: 120000, unit: ProductUnit.KG, availableQuantity: 150, minOrderQuantity: 2, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 764, harvestDate: '2025-12-01', img: 'https://images.unsplash.com/photo-1442550528053-c431ecb55509?w=600' },
      { sellerId: supplier.id, sellerType: SellerType.SUPPLIER, categoryId: CF, name: 'Cà phê Robusta BMT', description: 'Robusta Buôn Ma Thuột đậm vị, rang đậm.', pricePerUnit: 95000, unit: ProductUnit.KG, availableQuantity: 500, minOrderQuantity: 5, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 2890, harvestDate: '2025-12-15', img: 'https://images.unsplash.com/photo-1559525839-d9acfd564ca0?w=600' },
      { sellerId: supplier.id, sellerType: SellerType.SUPPLIER, categoryId: GV, name: 'Tiêu đen Phú Quốc', description: 'Tiêu đen Phú Quốc OCOP 5 sao, hương vị đặc trưng.', pricePerUnit: 180000, unit: ProductUnit.KG, availableQuantity: 200, minOrderQuantity: 1, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 3210, harvestDate: '2026-03-01', img: 'https://images.unsplash.com/photo-1599582907898-5cdb44389b66?w=600' },
      { sellerId: farmer.id, sellerType: SellerType.FARMER, categoryId: GV, name: 'Gừng tươi hữu cơ', description: 'Gừng tươi hữu cơ Kỳ Sơn, cay nồng, tinh dầu cao.', pricePerUnit: 45000, unit: ProductUnit.KG, availableQuantity: 400, minOrderQuantity: 5, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 1320, harvestDate: '2026-04-20', img: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=600' },
      { sellerId: coop.id, sellerType: SellerType.COOPERATIVE, categoryId: HD, name: 'Hạt điều rang muối W320', description: 'Hạt điều rang muối Bình Phước, W320, hạt to đều.', pricePerUnit: 180000, unit: ProductUnit.KG, availableQuantity: 500, minOrderQuantity: 2, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 3456, harvestDate: '2026-03-01', img: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600' },
      { sellerId: farmer.id, sellerType: SellerType.FARMER, categoryId: HD, name: 'Đậu phộng rang', description: 'Đậu phộng rang giòn truyền thống, Bình Định.', pricePerUnit: 55000, unit: ProductUnit.KG, availableQuantity: 1200, minOrderQuantity: 10, farmingType: FarmingType.TRADITIONAL, status: ProductStatus.ACTIVE, viewCount: 867, harvestDate: '2026-05-01', img: 'https://images.unsplash.com/photo-1567132875421-e84e6c8c0d56?w=600' },
      { sellerId: coop.id, sellerType: SellerType.COOPERATIVE, categoryId: MO, name: 'Mật ong hoa nhãn', description: 'Mật ong hoa nhãn nguyên chất Hưng Yên, thơm ngọt.', pricePerUnit: 180000, unit: ProductUnit.LITER, availableQuantity: 200, minOrderQuantity: 1, farmingType: FarmingType.ORGANIC, status: ProductStatus.ACTIVE, viewCount: 2670, harvestDate: '2026-07-01', img: 'https://images.unsplash.com/photo-1587049352851-8d4e8915b9c1?w=600' },
      { sellerId: farmer.id, sellerType: SellerType.FARMER, categoryId: HOA, name: 'Hoa cúc vàng Đà Lạt', description: 'Hoa cúc vàng tươi Đà Lạt, bó 20 cành.', pricePerUnit: 45000, unit: ProductUnit.BUNCH, availableQuantity: 500, minOrderQuantity: 5, farmingType: FarmingType.VIETGAP, status: ProductStatus.ACTIVE, viewCount: 1120, harvestDate: '2026-06-05', img: 'https://images.unsplash.com/photo-1597252294921-5e9a06c44a24?w=600' },
    ];

    const saved: Product[] = [];
    for (const spec of specs) {
      const { img, harvestDate, ...productData } = spec;
      const product = await productRepo.save({
        ...productData,
        harvestDate: new Date(harvestDate),
      });
      await imgRepo.save({
        productId: product.id,
        imageUrl: img,
        isPrimary: true,
        sortOrder: 0,
      });
      saved.push(product);

      // Add certifications for some
      if ([0, 3, 5, 9].includes(saved.length - 1)) {
        await certRepo.save({
          productId: product.id,
          certType: CertType.VIETGAP,
          certNumber: `VG-${Date.now()}-${saved.length}`,
          issuedBy: 'Bộ NN&PTNT',
          issuedDate: new Date('2025-01-01'),
          expiryDate: new Date('2027-01-01'),
          documentUrl: 'https://placehold.co/600x400/E8F5E9/1B5E20?text=Chung+nhan+VietGAP',
          isVerified: true,
          status: CertificationStatus.VERIFIED,
        });
      }
    }
    return saved;
  }

  private async seedCategories(repo: any) {
    const count = await repo.count();
    if (count > 0) return;
    // Similarly-named slug seeds from product-development-seed.service
    // use sequential slug-based identifiers. We match those slugs here.
    const cats = [
      { name: 'Trái cây', slug: 'trai-cay', description: 'Trái cây tươi các loại', sortOrder: 1, isActive: true },
      { name: 'Rau củ quả', slug: 'rau-cu-qua', description: 'Rau củ quả tươi sạch', sortOrder: 2, isActive: true },
      { name: 'Lúa gạo & ngũ cốc', slug: 'lua-gao-ngu-coc', description: 'Gạo, nếp & ngũ cốc', sortOrder: 3, isActive: true },
      { name: 'Cà phê & chè', slug: 'ca-phe-che', description: 'Cà phê, chè các loại', sortOrder: 4, isActive: true },
      { name: 'Gia vị & thảo mộc', slug: 'gia-vi-thao-moc', description: 'Gia vị, thảo mộc tự nhiên', sortOrder: 5, isActive: true },
      { name: 'Hạt & đậu', slug: 'hat-dau', description: 'Các loại hạt, đậu, mè', sortOrder: 6, isActive: true },
      { name: 'Mật ong & đặc sản', slug: 'mat-ong-dac-san', description: 'Mật ong & đặc sản vùng miền', sortOrder: 7, isActive: true },
      { name: 'Thủy sản', slug: 'thuy-san', description: 'Thủy hải sản tươi sống', sortOrder: 8, isActive: true },
      { name: 'Gia súc gia cầm', slug: 'gia-suc-gia-cam', description: 'Thịt, trứng, sữa', sortOrder: 9, isActive: true },
      { name: 'Hoa & cây cảnh', slug: 'hoa-cay-canh', description: 'Hoa tươi & cây cảnh', sortOrder: 10, isActive: true },
    ];
    for (const c of cats) {
      await repo.save(repo.create(c));
    }
  }

  // ── FORUM ────────────────────────────────────────────────────────────
  private async seedForum(farmerId: string, coopId: string, buyerId: string, products: Product[]) {
    const postRepo = this.ds.getRepository(ForumPost);
    const commentRepo = this.ds.getRepository(ForumComment);
    const likeRepo = this.ds.getRepository(ForumLike);

    const existing = await postRepo.count();
    if (existing > 0) return [];

    const posts: Partial<ForumPost>[] = [
      { authorId: farmerId, title: 'Kỹ thuật trồng lúa ST25 đạt năng suất cao', content: '<p>Chào mọi người, tôi đã trồng giống lúa ST25 được 3 vụ liên tiếp. Sau đây tôi xin chia sẻ một số kinh nghiệm để đạt năng suất cao nhất:</p><ul><li>Chọn giống từ nguồn uy tín</li><li>Làm đất kỹ trước khi cấy</li><li>Bón phân đúng giai đoạn</li></ul><p>Ai có thắc mắc gì cứ hỏi nhé!</p>', category: ForumCategory.TECHNICAL, viewCount: 342, likeCount: 15, commentCount: 3 },
      { authorId: coopId, title: 'Thị trường trái cây nhập khẩu cuối năm 2026', content: '<p>Dự báo giá trái cây nhập khẩu cuối năm 2026: sầu riêng tăng 15%, vải thiều giảm 10% do Trung Quốc tăng sản lượng nội địa. Chi tiết từng loại:</p><ol><li><strong>Sầu riêng Ri6</strong>: 85.000 - 95.000 đ/kg</li><li><strong>Thanh long ruột đỏ</strong>: 30.000 - 40.000 đ/kg</li><li><strong>Vải thiều</strong>: 40.000 - 50.000 đ/kg</li></ol>', category: ForumCategory.MARKET, viewCount: 567, likeCount: 28, commentCount: 5 },
      { authorId: buyerId, title: 'Kinh nghiệm mua nông sản online uy tín', content: '<p>Là người mua hàng thường xuyên trên AgriLink, tôi muốn chia sẻ một số mẹo để mua được nông sản chất lượng:</p><p><strong>1. Kiểm tra điểm tin cậy của người bán</strong><br>Luôn xem trust score và số lượng giao dịch đã hoàn thành.</p><p><strong>2. Đọc kỹ thông tin sản phẩm</strong><br>Xem giấy chứng nhận VietGAP, hữu cơ, ngày thu hoạch.</p><p><strong>3. Liên hệ trực tiếp với người bán</strong><br>Nhắn tin đặt câu hỏi trước khi đặt hàng.</p>', category: ForumCategory.EXPERIENCE, viewCount: 234, likeCount: 12, commentCount: 2 },
      { authorId: farmerId, title: 'Tình hình sâu bệnh trên cây ăn trái mùa mưa', content: '<p>Mùa mưa năm nay ở ĐBSCL có nhiều diễn biến phức tạp. Một số bệnh thường gặp trên cây có múi: vàng lá thối rễ, greening, sâu vẽ bùa.</p><p>Giải pháp tôi áp dụng hiệu quả: phòng trừ tổng hợp IPM, sử dụng chế phẩm sinh học thay vì hóa chất. Mong được trao đổi thêm với anh em nông dân cả nước!</p>', category: ForumCategory.TECHNICAL, viewCount: 189, likeCount: 22 },
      { authorId: coopId, title: 'HTX Xanh Tiền Giang tuyển thành viên mới', content: '<p>HTX Nông nghiệp Xanh Tiền Giang thông báo tuyển thêm 20 hộ xã viên cho vụ Đông Xuân 2026-2027.</p><p><strong>Quyền lợi:</strong></p><ul><li>Hỗ trợ giống, vật tư đầu vào</li><li>Bao tiêu sản phẩm đầu ra</li><li>Tập huấn kỹ thuật canh tác</li><li>Hỗ trợ vay vốn ngân hàng</li></ul><p>Liên hệ: +84902372975 - HTX Xanh Tiền Giang.</p>', category: ForumCategory.EXPERIENCE, viewCount: 98, likeCount: 8 },
    ];

    const saved: ForumPost[] = [];
    for (const p of posts) {
      const post = await postRepo.save(p);
      saved.push(post);

      // Comments on first post
      if (saved.length === 1) {
        await commentRepo.save({ postId: post.id, authorId: buyerId, content: 'Bài viết rất hữu ích. Anh có thể chia sẻ thêm về cách xử lý sâu đục thân không?' });
        await commentRepo.save({ postId: post.id, authorId: coopId, content: 'Tôi cũng trồng ST25, thấy hiệu quả kinh tế cao hơn giống thường 25-30%. Ủng hộ bài viết!' });
        await commentRepo.save({ postId: post.id, authorId: farmerId, content: 'Cảm ơn anh em đã quan tâm. Tôi sẽ viết thêm phần 2 chi tiết hơn nhé!' });
      }
      if (saved.length === 2) {
        await commentRepo.save({ postId: post.id, authorId: buyerId, content: 'Cảm ơn thông tin. Giá sầu riêng tôi thấy còn có thể tăng nữa vì nhu cầu Trung Quốc lớn.' });
        await commentRepo.save({ postId: post.id, authorId: farmerId, content: 'Nhà vườn bên tôi đang tập trung cải tạo vườn để tăng sản lượng sầu riêng cho vụ tới.' });
        await commentRepo.save({ postId: post.id, authorId: coopId, content: 'Chính xác! Thị trường sầu riêng Trung Quốc còn tăng trưởng tốt ít nhất 2-3 năm nữa.' });
        await commentRepo.save({ postId: post.id, authorId: buyerId, content: 'Cập nhật thêm: giá sầu riêng tại chợ đầu mối Thủ Đức hiện 90.000đ/kg.' });
      }
    }

    // Likes spread
    const likers = [farmerId, coopId, buyerId];
    for (const post of saved) {
      for (const liker of likers) {
        if (post.likeCount > 0 && Math.random() > 0.3) {
          await likeRepo.save({ postId: post.id, userId: liker }).catch(() => {});
        }
      }
    }

    return saved;
  }

  // ── REVIEWS ─────────────────────────────────────────────────────────
  private async seedReviews(farmerId: string, coopId: string, buyerId: string, enterpriseId: string, products: Product[]) {
    const repo = this.ds.getRepository(Review);
    const existing = await repo.count();
    if (existing > 0) return [];

    const productIds = products.filter(p => p.status === ProductStatus.ACTIVE).map(p => p.id).slice(0, 8);
    const reviews: { reviewerId: string; productId: string; rating: number; comment: string; isVerifiedPurchase: boolean }[] = [
      { reviewerId: buyerId, productId: productIds[0], rating: 5, comment: 'Xoài rất ngọt, thơm, đóng gói cẩn thận. Giao hàng nhanh.', isVerifiedPurchase: true },
      { reviewerId: enterpriseId, productId: productIds[0], rating: 4, comment: 'Chất lượng tốt, giá hợp lý. Sẽ đặt thêm cho nhà máy chế biến.', isVerifiedPurchase: true },
      { reviewerId: buyerId, productId: productIds[1], rating: 5, comment: 'Sầu riêng Ri6 chuẩn vị Cai Lậy. Cơm vàng, hột lép, thơm nức.', isVerifiedPurchase: true },
      { reviewerId: enterpriseId, productId: productIds[2], rating: 4, comment: 'Bưởi da xanh ngon, múi mọng nước. Giá hợp lý.', isVerifiedPurchase: false },
      { reviewerId: buyerId, productId: productIds[3], rating: 5, comment: 'Thanh long đỏ đẹp, ngọt. Xuất khẩu như lời giới thiệu.', isVerifiedPurchase: true },
      { reviewerId: enterpriseId, productId: productIds[4], rating: 3, comment: 'Dưa hấu ngon nhưng size hơi nhỏ so với yêu cầu.', isVerifiedPurchase: true },
      { reviewerId: buyerId, productId: productIds[5], rating: 5, comment: 'Vải thiều Lục Ngạn chính gốc. Trái to, ngọt đậm. Rất hài lòng!', isVerifiedPurchase: true },
      { reviewerId: farmerId, productId: productIds[6], rating: 4, comment: 'Rau muống tươi ngon, không thuốc. Gia đình tôi mua thường xuyên.', isVerifiedPurchase: false },
      { reviewerId: buyerId, productId: productIds[7], rating: 5, comment: 'Cà rốt Đà Lạt ngọt giòn, làm salad rất ngon.', isVerifiedPurchase: true },
    ];

    for (const r of reviews) {
      await repo.save(repo.create(r));
    }
    return reviews;
  }

  // ── ADS ──────────────────────────────────────────────────────────────
  private async seedAdPackages() {
    const repo = this.ds.getRepository(AdPackage);
    const existing = await repo.count();
    if (existing > 0) return;

    await repo.save([
      { name: 'Banner chính (Carousel)', adType: AdType.BANNER, price: 500000, durationDays: 30, maxImpressions: 10000, description: 'Hiển thị trên carousel trang chủ', isActive: true },
      { name: 'Sản phẩm nổi bật', adType: AdType.FEATURED, price: 300000, durationDays: 14, maxImpressions: 5000, description: 'Sản phẩm được gắn nhãn nổi bật', isActive: true },
      { name: 'Spotlight tuần', adType: AdType.SPOTLIGHT, price: 700000, durationDays: 7, maxImpressions: 20000, description: 'Hiển thị spotlight nổi bật 7 ngày', isActive: true },
    ]);
  }

  private async seedAdCampaigns(supplierId: string, adminId: string) {
    const repo = this.ds.getRepository(AdCampaign);
    const packages = await this.ds.getRepository(AdPackage).find();
    const existing = await repo.count();
    if (existing > 0) return;

    const now = new Date();
    const start = new Date(now); start.setDate(start.getDate() - 5);
    const end = new Date(now); end.setDate(end.getDate() + 25);

    // Use repo.insert to bypass TypeORM DeepPartial strictness
    const campaignRepo = this.ds.getRepository(AdCampaign);
    for (const c of [
      { supplierId, packageId: packages[0].id, title: 'Nông sản sạch Đà Lạt', imageUrl: 'https://images.unsplash.com/photo-1558350319-de0b7d50a49e?w=1200&q=80', linkUrl: 'https://agrilink.vn/products', status: AdStatus.ACTIVE, startDate: start, endDate: end, totalImpressions: 4500, totalClicks: 230 },
      { supplierId, packageId: packages[1].id, title: 'Đặc sản vùng miền — Khuyến mãi tháng 7', imageUrl: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=800&q=80', status: AdStatus.ACTIVE, startDate: start, endDate: end, totalImpressions: 2100, totalClicks: 98 },
      { supplierId, packageId: packages[2].id, title: 'Sầu riêng Ri6 chính vụ', imageUrl: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=800&q=80', status: AdStatus.ACTIVE, startDate: start, endDate: end, totalImpressions: 7800, totalClicks: 420 },
      { supplierId, packageId: packages[0].id, title: 'Phân bón hữu cơ — Giảm 15%', imageUrl: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=1200&q=80', status: AdStatus.PENDING_APPROVAL },
    ]) {
      await campaignRepo.save(c as any);
    }
  }

  // ── COOPERATIVE ──────────────────────────────────────────────────────
  private async seedCoopMembers(coopId: string, farmerId: string): Promise<number> {
    const repo = this.ds.getRepository(CooperativeMemberEntity);
    const existing = await repo.count();
    if (existing > 0) return existing;

    const allFarmers = await this.ds.getRepository(User).find({ where: { role: UserRole.FARMER } });
    // Create members for each farmer (except the coop account itself)
    for (const f of allFarmers.slice(0, 5)) {
      await repo.save({
        cooperativeId: coopId,
        farmerId: f.id,
        status: 'active',
        role: 'Thành viên sản xuất',
        joinedAt: new Date(),
      } as any);
    }
    return allFarmers.slice(0, 5).length;
  }

  private async seedBulkListings(coopId: string, farmerId: string, products: Product[]) {
    const repo = this.ds.getRepository(BulkListingEntity);
    const contribRepo = this.ds.getRepository(BulkListingContributionEntity);
    const existing = await repo.count();
    if (existing > 0) return;

    const listing = await repo.save({
      cooperativeId: coopId,
      title: 'Xoài cát Hòa Lộc — Thu gom vụ hè',
      description: 'Thu gom xoài cát Hòa Lộc từ 15 hộ xã viên, sản lượng 5 tấn, đạt VietGAP.',
      totalQuantity: 5000,
      unit: ProductUnit.KG,
      pricePerUnit: 42000,
      deadline: new Date('2026-07-15'),
      isOpen: true,
    } as any);

    await contribRepo.save([
      { bulkListingId: listing.id, farmerId, quantity: 1500, unit: ProductUnit.KG },
      { bulkListingId: listing.id, farmerId: farmerId, quantity: 2000, unit: ProductUnit.KG },
    ] as any);

    await repo.save({
      cooperativeId: coopId,
      title: 'Thanh long ruột đỏ — Đơn hàng xuất khẩu',
      description: 'Đáp ứng đơn hàng xuất khẩu Trung Quốc 10 tấn, yêu cầu GlobalGAP.',
      totalQuantity: 10000,
      unit: ProductUnit.KG,
      pricePerUnit: 33000,
      deadline: new Date('2026-07-20'),
      isOpen: true,
    } as any);
  }

  private async seedHarvestSchedules(coopId: string, farmerId: string, productId: string) {
    const repo = this.ds.getRepository(HarvestScheduleEntity);
    const existing = await repo.count();
    if (existing > 0) return;

    const schedules = [
      { userId: farmerId, productId, cropName: 'Xoài cát Hòa Lộc', expectedHarvestDate: new Date('2026-07-15'), estimatedQuantity: 2000, unit: ProductUnit.KG, notes: 'Xoài cát: vụ chính' },
      { userId: farmerId, productId, cropName: 'Xoài cát Hòa Lộc', expectedHarvestDate: new Date('2026-07-20'), estimatedQuantity: 1500, unit: ProductUnit.KG, notes: 'Xoài cát: vụ muộn' },
      { userId: farmerId, productId, cropName: 'Xoài cát Hòa Lộc', expectedHarvestDate: new Date('2026-08-01'), estimatedQuantity: 3000, unit: ProductUnit.KG, notes: 'Xoài cát: vụ rải' },
    ];
    for (const s of schedules) {
      await repo.save(s as any);
    }
  }

  // ── VIOLATIONS ───────────────────────────────────────────────────────
  private async seedViolations(productId: string, adminId: string) {
    const repo = this.ds.getRepository(Product);
    const existing = await repo.findOne({ where: { status: ProductStatus.SUSPENDED } });
    if (existing) return;

    const users = await this.ds.getRepository(User).find();
    const farmer = users.find(u => u.role === UserRole.FARMER)!;
    const supplier = users.find(u => u.role === UserRole.SUPPLIER)!;

    await repo.save({
      sellerId: farmer.id,
      sellerType: SellerType.FARMER,
      name: 'Thuốc trừ sâu không tem nhãn',
      description: 'Thuốc BVTV không rõ nguồn gốc, vi phạm chất lượng',
      price: 50000,
      unit: ProductUnit.LITER,
      stockQuantity: 100,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.SUSPENDED,
      rejectionReason: 'Vi phạm chính sách chất lượng. Hàng hóa không rõ nguồn gốc, không tem nhãn phụ theo quy định.',
    });
    await repo.save({
      sellerId: supplier.id,
      sellerType: SellerType.SUPPLIER,
      name: 'Phân bón kém chất lượng',
      description: 'Phân bón NPK không đạt hàm lượng cam kết',
      price: 120000,
      unit: ProductUnit.KG,
      stockQuantity: 500,
      farmingType: FarmingType.TRADITIONAL,
      status: ProductStatus.SUSPENDED,
      rejectionReason: 'Hàm lượng NPK thực tế chỉ đạt 60% so với nhãn mác. Vi phạm QC 01-2025 về phân bón.',
    });
  }

  // ── AUDIT LOGS ───────────────────────────────────────────────────────
  private async seedAuditLogs(adminId: string, stateAgencyId: string) {
    const repo = this.ds.getRepository(AuditLog);
    const existing = await repo.count();
    if (existing > 0) return;

    const logs = [
      { userId: adminId, action: 'USER_LOGIN', entityType: 'User', createdAt: new Date('2026-07-23T08:00:00Z') },
      { userId: adminId, action: 'PRODUCT_APPROVED', entityType: 'Product', createdAt: new Date('2026-07-23T08:30:00Z') },
      { userId: stateAgencyId, action: 'PRODUCT_SUSPENDED', entityType: 'Product', changes: { before: { status: 'active' }, after: { status: 'suspended', reason: 'Hàng không rõ nguồn gốc' } }, createdAt: new Date('2026-07-22T14:00:00Z') },
      { userId: adminId, action: 'AD_APPROVED', entityType: 'AdCampaign', createdAt: new Date('2026-07-21T10:00:00Z') },
      { userId: stateAgencyId, action: 'CERTIFICATION_VERIFIED', entityType: 'ProductCertification', createdAt: new Date('2026-07-20T09:15:00Z') },
      { userId: adminId, action: 'USER_REGISTERED', entityType: 'User', createdAt: new Date('2026-07-19T16:00:00Z') },
      { userId: adminId, action: 'SYSTEM_CONFIG_UPDATED', entityType: 'SystemConfig', changes: { before: { feature_forum: false }, after: { feature_forum: true } }, createdAt: new Date('2026-07-18T11:00:00Z') },
    ];
    for (const log of logs) {
      await repo.save(log);
    }
  }

  // ── NOTIFICATIONS ────────────────────────────────────────────────────
  private async seedNotifications(users: Record<string, User>) {
    const repo = this.ds.getRepository(NotificationOrmEntity);
    const existing = await repo.count();
    if (existing > 0) return;

    const notifs = [
      { userId: users.FARMER.id, type: NotifType.NEW_ORDER, title: 'Đơn hàng mới #DH-001', body: 'Người mua Trần Thị Thu đã đặt 50kg xoài cát Hòa Lộc.' },
      { userId: users.FARMER.id, type: NotifType.NEW_REVIEW, title: 'Có đánh giá mới', body: 'Người mua đã đánh giá 5 sao sản phẩm Xoài cát Hòa Lộc.' },
      { userId: users.COOP.id, type: NotifType.MEMBER_REQUEST, title: 'Yêu cầu tham gia HTX', body: 'Nông dân Nguyễn Văn Mới muốn tham gia HTX.' },
      { userId: users.COOP.id, type: NotifType.PRODUCT_STATUS_CHANGED, title: 'Trạng thái đơn hàng cập nhật', body: 'Đơn hàng #DH-015 đã được xác nhận.' },
      { userId: users.BUYER.id, type: NotifType.ORDER_CONFIRMED, title: 'Đơn hàng đã xác nhận', body: 'Đơn hàng #DH-003 đã được người bán xác nhận.' },
      { userId: users.BUYER.id, type: NotifType.ORDER_SHIPPED, title: 'Đơn hàng đang giao', body: 'Đơn hàng #DH-001 đã được bàn giao vận chuyển.' },
      { userId: users.ENTERPRISE.id, type: NotifType.ORDER_DELIVERED, title: 'Đơn hàng đã giao thành công', body: 'Đơn hàng #DH-010 đã giao. Vui lòng kiểm tra và xác nhận.' },
      { userId: users.SUPPLIER.id, type: NotifType.NEW_ORDER, title: 'Đơn hàng vật tư mới', body: 'HTX Nông nghiệp Xanh đặt 200kg phân bón hữu cơ.' },
      { userId: users.SUPPLIER.id, type: NotifType.AD_APPROVED, title: 'Quảng cáo đã duyệt', body: 'Chiến dịch "Nông sản sạch Đà Lạt" đã được phê duyệt.' },
      { userId: users.LOGISTICS.id, type: NotifType.NEW_ORDER, title: 'Yêu cầu vận chuyển mới', body: 'Đơn hàng cần vận chuyển từ Tiền Giang đến TP.HCM.' },
      { userId: users.STATE_AGENCY.id, type: NotifType.PRODUCT_REJECTED, title: 'Sản phẩm vi phạm', body: 'Sản phẩm "Thuốc trừ sâu không tem nhãn" đã bị tạm khóa.' },
      { userId: users.ADMIN.id, type: NotifType.AD_REJECTED, title: 'Quảng cáo chờ duyệt', body: 'Có 1 chiến dịch quảng cáo mới cần phê duyệt.' },
    ];

    for (const n of notifs) {
      await repo.save(repo.create(n));
    }
  }
}
