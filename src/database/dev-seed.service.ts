import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AdPackage } from '../modules/ads/infrastructure/persistence/entities/ad-package.entity';

import { AdType } from '../common/enums';
import type { LegacyDevActorIds } from './seeds/legacy-remaining-dev-seed.group';

@Injectable()
export class DevSeedService {
  private readonly logger = new Logger(DevSeedService.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async seedRemainingLegacySections(_users: LegacyDevActorIds): Promise<void> {
    const log = this.logger;

    await this.seedAdPackages();
    log.log(`[Seed] ad packages seeded`);
  }

  private async resetAll(): Promise<void> {
    // Temporary C2/C3/C4 reset debt. C1-owned and deferred targets are omitted;
    // the method itself remains scheduled for retirement in P8-05C4.
    const tables = ['ad_packages', 'ad_events'];
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
      { name: 'Banner chính (Carousel)', packageCode: 'HOMEPAGE_CAROUSEL', adType: AdType.BANNER, price: 500000, durationDays: 30, maxImpressions: 10000, description: 'Hiển thị trên carousel trang chủ', isActive: true },
      { name: 'Sản phẩm nổi bật', packageCode: 'FEATURED_PRODUCT', adType: AdType.FEATURED, price: 300000, durationDays: 14, maxImpressions: 5000, description: 'Sản phẩm được gắn nhãn nổi bật', isActive: true },
      { name: 'Spotlight tuần', packageCode: 'SPOTLIGHT_PLACEMENT', adType: AdType.SPOTLIGHT, price: 700000, durationDays: 7, maxImpressions: 20000, description: 'Hiển thị spotlight nổi bật 7 ngày', isActive: true },
    ]);
  }
}
