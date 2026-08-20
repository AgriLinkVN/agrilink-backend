import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ForumPost } from '../modules/forum/entities/forum-post.entity';
import { ForumComment } from '../modules/forum/entities/forum-comment.entity';
import { ForumLike } from '../modules/forum/entities/forum-like.entity';
import { AdCampaign } from '../modules/ads/infrastructure/persistence/entities/ad-campaign.entity';
import { AdPackage } from '../modules/ads/infrastructure/persistence/entities/ad-package.entity';
import { BulkListingEntity } from '../modules/cooperatives/infrastructure/persistence/entities/bulk-listing.entity';
import { BulkListingContributionEntity } from '../modules/cooperatives/infrastructure/persistence/entities/bulk-listing-contribution.entity';
import { HarvestScheduleEntity } from '../modules/cooperatives/infrastructure/persistence/entities/harvest-schedule.entity';

import { ProductUnit, AdType, AdStatus } from '../common/enums';
import { ForumCategory } from '../modules/forum/entities/forum-post.entity';
import type {
  LegacyDevActorIds,
  LegacyDevProductIds,
} from './seeds/legacy-remaining-dev-seed.group';

@Injectable()
export class DevSeedService {
  private readonly logger = new Logger(DevSeedService.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async seedRemainingLegacySections(
    users: LegacyDevActorIds,
    products: LegacyDevProductIds,
  ): Promise<void> {
    const log = this.logger;
    const { ADMIN, FARMER, BUYER, SUPPLIER, COOP } = users;

    const posts = await this.seedForum(FARMER, COOP, BUYER);
    log.log(`[Seed] ${posts.length} forum posts seeded`);

    await this.seedAdPackages();
    await this.seedAdCampaigns(SUPPLIER, ADMIN);
    log.log(`[Seed] ads seeded`);

    await this.seedBulkListings(COOP, FARMER);
    await this.seedHarvestSchedules(FARMER, products.XOAI_HOA_LOC);
    log.log(`[Seed] cooperative bulk and harvest data seeded`);
  }

  private async resetAll(): Promise<void> {
    // Temporary C2/C3/C4 reset debt. C1-owned and deferred targets are omitted;
    // the method itself remains scheduled for retirement in P8-05C4.
    const tables = [
      'harvest_schedules', 'bulk_listing_contributions', 'bulk_listings',
      'forum_likes', 'forum_comments', 'forum_posts',
      'ad_campaigns', 'ad_packages', 'ad_events',
    ];
    for (const t of tables) {
      try { await this.ds.query(`DELETE FROM "${t}"`); } catch { /* skip non-existent */ }
    }
    this.logger.log('[Seed] Remaining legacy tables reset');
  }

  // ── FORUM ────────────────────────────────────────────────────────────
  private async seedForum(farmerId: string, coopId: string, buyerId: string) {
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
  private async seedBulkListings(coopId: string, farmerId: string) {
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

  private async seedHarvestSchedules(farmerId: string, productId: string) {
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

}
