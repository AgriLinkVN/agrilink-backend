import {
  AdCampaignListResult,
  AdCampaignModerationFilter,
  AdCampaignModel,
  AdCampaignPagination,
  AdPackageModel,
  CreateAdCampaignInput,
  ModerateAdCampaignInput,
  TrackAdEventInput,
} from '../../models/ads.model';

export const ADS_REPOSITORY = Symbol('ADS_REPOSITORY');

export interface AdsRepositoryPort {
  findActivePackages(): Promise<AdPackageModel[]>;
  findActivePackageById(id: number): Promise<AdPackageModel | null>;
  createCampaign(
    supplierId: string,
    input: CreateAdCampaignInput,
  ): Promise<AdCampaignModel>;
  findCampaignsBySupplier(
    supplierId: string,
    pagination: AdCampaignPagination,
  ): Promise<AdCampaignListResult>;
  findCampaignById(id: string): Promise<AdCampaignModel | null>;
  updateCampaignStatus(
    id: string,
    status: AdCampaignModel['status'],
  ): Promise<AdCampaignModel>;
  findCampaignsForModeration(
    filter: AdCampaignModerationFilter,
  ): Promise<AdCampaignListResult>;
  moderateCampaign(
    id: string,
    input: ModerateAdCampaignInput,
  ): Promise<AdCampaignModel>;
  findActiveBanners(provinceId?: number): Promise<AdCampaignModel[]>;
  recordEvent(input: TrackAdEventInput): Promise<void>;
}
