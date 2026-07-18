import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdsController } from './presentation/controllers/ads.controller';
import {
  CreateAdCampaignUseCase,
  GetSupplierAdCampaignUseCase,
  ListActiveAdBannersUseCase,
  ListAdPackagesUseCase,
  ListSupplierAdCampaignsUseCase,
  PauseAdCampaignUseCase,
  ResumeAdCampaignUseCase,
  TrackAdEventUseCase,
} from './application/use-cases/ads.use-cases';
import { ADS_REPOSITORY } from './application/ports/outbound/ads-repository.port';
import { AdCampaign } from './infrastructure/persistence/entities/ad-campaign.entity';
import { AdEvent } from './infrastructure/persistence/entities/ad-event.entity';
import { AdPackage } from './infrastructure/persistence/entities/ad-package.entity';
import { TypeOrmAdsRepository } from './infrastructure/persistence/repositories/typeorm-ads.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AdPackage, AdCampaign, AdEvent])],
  controllers: [AdsController],
  providers: [
    TypeOrmAdsRepository,
    ListAdPackagesUseCase,
    CreateAdCampaignUseCase,
    ListSupplierAdCampaignsUseCase,
    GetSupplierAdCampaignUseCase,
    PauseAdCampaignUseCase,
    ResumeAdCampaignUseCase,
    ListActiveAdBannersUseCase,
    TrackAdEventUseCase,
    {
      provide: ADS_REPOSITORY,
      useExisting: TypeOrmAdsRepository,
    },
  ],
})
export class AdsModule {}
