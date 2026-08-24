import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AdCampaign } from '../modules/ads/infrastructure/persistence/entities/ad-campaign.entity';
import { AdPackage } from '../modules/ads/infrastructure/persistence/entities/ad-package.entity';

import { AdType, AdStatus } from '../common/enums';
import type { LegacyDevActorIds } from './seeds/legacy-remaining-dev-seed.group';

@Injectable()
export class DevSeedService {
  private readonly logger = new Logger(DevSeedService.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async seedRemainingLegacySections(users: LegacyDevActorIds): Promise<void> {
    const log = this.logger;
    const { ADMIN, SUPPLIER } = users;

    await this.seedAdPackages();
    await this.seedAdCampaigns(SUPPLIER, ADMIN);
    log.log(`[Seed] ads seeded`);
  }

  private async resetAll(): Promise<void> {
    // Temporary C2/C3/C4 reset debt. C1-owned and deferred targets are omitted;
    // the method itself remains scheduled for retirement in P8-05C4.
    const tables = [
      'ad_campaigns', 'ad_packages', 'ad_events',
    ];
    for (const t of tables) {
      try { await this.ds.query(`DELETE FROM "${t}"`); } catch { /* skip non-existent */ }
    }
    this.logger.log('[Seed] Remaining legacy tables reset');
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
}
