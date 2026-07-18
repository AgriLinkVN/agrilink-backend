import { Inject, Injectable } from '@nestjs/common';

import { AdStatus } from '@common/enums';
import {
  AdCampaignForbiddenError,
  AdCampaignNotFoundError,
  AdPackageNotFoundError,
} from '../errors/ads-application.error';
import {
  AdCampaignListResult,
  AdCampaignModel,
  AdCampaignPagination,
  AdPackageModel,
  CreateAdCampaignInput,
  TrackAdEventInput,
} from '../models/ads.model';
import {
  ADS_REPOSITORY,
  AdsRepositoryPort,
} from '../ports/outbound/ads-repository.port';
import {
  assertCampaignCanBePaused,
  assertCampaignCanBeResumed,
} from '../../domain/policies/campaign-status.policy';

function assertCampaignOwner(campaign: AdCampaignModel, supplierId: string): void {
  if (campaign.supplierId !== supplierId) {
    throw new AdCampaignForbiddenError();
  }
}

@Injectable()
export class ListAdPackagesUseCase {
  constructor(
    @Inject(ADS_REPOSITORY)
    private readonly ads: AdsRepositoryPort,
  ) {}

  execute(): Promise<AdPackageModel[]> {
    return this.ads.findActivePackages();
  }
}

@Injectable()
export class CreateAdCampaignUseCase {
  constructor(
    @Inject(ADS_REPOSITORY)
    private readonly ads: AdsRepositoryPort,
  ) {}

  async execute(
    supplierId: string,
    input: CreateAdCampaignInput,
  ): Promise<AdCampaignModel> {
    const adPackage = await this.ads.findActivePackageById(input.packageId);
    if (!adPackage) {
      throw new AdPackageNotFoundError();
    }
    return this.ads.createCampaign(supplierId, input);
  }
}

@Injectable()
export class ListSupplierAdCampaignsUseCase {
  constructor(
    @Inject(ADS_REPOSITORY)
    private readonly ads: AdsRepositoryPort,
  ) {}

  execute(
    supplierId: string,
    pagination: AdCampaignPagination,
  ): Promise<AdCampaignListResult> {
    return this.ads.findCampaignsBySupplier(supplierId, pagination);
  }
}

@Injectable()
export class GetSupplierAdCampaignUseCase {
  constructor(
    @Inject(ADS_REPOSITORY)
    private readonly ads: AdsRepositoryPort,
  ) {}

  async execute(id: string, supplierId: string): Promise<AdCampaignModel> {
    const campaign = await this.ads.findCampaignById(id);
    if (!campaign) {
      throw new AdCampaignNotFoundError();
    }
    assertCampaignOwner(campaign, supplierId);
    return campaign;
  }
}

@Injectable()
export class PauseAdCampaignUseCase {
  constructor(
    @Inject(ADS_REPOSITORY)
    private readonly ads: AdsRepositoryPort,
  ) {}

  async execute(id: string, supplierId: string): Promise<AdCampaignModel> {
    const campaign = await this.ads.findCampaignById(id);
    if (!campaign) {
      throw new AdCampaignNotFoundError();
    }
    assertCampaignOwner(campaign, supplierId);
    assertCampaignCanBePaused(campaign.status);
    return this.ads.updateCampaignStatus(id, AdStatus.PAUSED);
  }
}

@Injectable()
export class ResumeAdCampaignUseCase {
  constructor(
    @Inject(ADS_REPOSITORY)
    private readonly ads: AdsRepositoryPort,
  ) {}

  async execute(id: string, supplierId: string): Promise<AdCampaignModel> {
    const campaign = await this.ads.findCampaignById(id);
    if (!campaign) {
      throw new AdCampaignNotFoundError();
    }
    assertCampaignOwner(campaign, supplierId);
    assertCampaignCanBeResumed(campaign.status);
    return this.ads.updateCampaignStatus(id, AdStatus.ACTIVE);
  }
}

@Injectable()
export class ListActiveAdBannersUseCase {
  constructor(
    @Inject(ADS_REPOSITORY)
    private readonly ads: AdsRepositoryPort,
  ) {}

  execute(provinceId?: number): Promise<AdCampaignModel[]> {
    return this.ads.findActiveBanners(provinceId);
  }
}

@Injectable()
export class TrackAdEventUseCase {
  constructor(
    @Inject(ADS_REPOSITORY)
    private readonly ads: AdsRepositoryPort,
  ) {}

  async execute(input: TrackAdEventInput): Promise<void> {
    const campaign = await this.ads.findCampaignById(input.campaignId);
    if (!campaign || campaign.status !== AdStatus.ACTIVE) {
      return;
    }
    await this.ads.recordEvent(input);
  }
}
