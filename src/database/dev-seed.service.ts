import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import type { LegacyDevActorIds } from './seeds/legacy-remaining-dev-seed.group';

@Injectable()
export class DevSeedService {
  private readonly logger = new Logger(DevSeedService.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async seedRemainingLegacySections(_users: LegacyDevActorIds): Promise<void> {
    this.logger.log('[Seed] no legacy business fixtures remain');
  }

  private async resetAll(): Promise<void> {
    // Temporary C2/C3/C4 reset debt. C1-owned and deferred targets are omitted;
    // the method itself remains scheduled for retirement in P8-05C4.
    const tables = ['ad_events'];
    for (const t of tables) {
      try { await this.ds.query(`DELETE FROM "${t}"`); } catch { /* skip non-existent */ }
    }
    this.logger.log('[Seed] Remaining legacy tables reset');
  }

}
