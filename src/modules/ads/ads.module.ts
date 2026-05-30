import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { AdPackage } from './entities/ad-package.entity';
import { AdCampaign } from './entities/ad-campaign.entity';
import { AdEvent } from './entities/ad-event.entity';
import { AuditLog } from '../admin/entities/audit-log.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { redisProvider } from './redis.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdPackage, AdCampaign, AdEvent, AuditLog]),
    NotificationsModule,
  ],
  controllers: [AdsController],
  providers: [AdsService, redisProvider],
  exports: [AdsService],
})
export class AdsModule {}
