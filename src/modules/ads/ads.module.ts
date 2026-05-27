import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { AdPackage } from './entities/ad-package.entity';
import { AdCampaign } from './entities/ad-campaign.entity';
import { AdEvent } from './entities/ad-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdPackage, AdCampaign, AdEvent])],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
