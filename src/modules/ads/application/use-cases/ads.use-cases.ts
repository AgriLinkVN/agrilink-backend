import { Inject, Injectable } from '@nestjs/common';

import { AdStatus, NotifType } from '@common/enums';
import {
  NOTIFICATION_PUBLISHER,
  NotificationPublisherPort,
} from '@modules/notifications/application/ports/inbound/notification-publisher.port';
import {
  AdCampaignForbiddenError,
  AdCampaignNotFoundError,
  AdPackageNotFoundError,
} from '../errors/ads-application.error';
import {
  AdCampaignListResult,
  AdCampaignModerationFilter,
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
  assertCampaignCanBeModerated,
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

@Injectable()
export class ListAdCampaignsForModerationUseCase {
  constructor(
    @Inject(ADS_REPOSITORY)
    private readonly ads: AdsRepositoryPort,
  ) {}

  execute(filter: AdCampaignModerationFilter): Promise<AdCampaignListResult> {
    return this.ads.findCampaignsForModeration(filter);
  }
}

@Injectable()
export class GetAdCampaignForModerationUseCase {
  constructor(
    @Inject(ADS_REPOSITORY)
    private readonly ads: AdsRepositoryPort,
  ) {}

  async execute(id: string): Promise<AdCampaignModel> {
    const campaign = await this.ads.findCampaignById(id);
    if (!campaign) {
      throw new AdCampaignNotFoundError();
    }
    return campaign;
  }
}

@Injectable()
export class ApproveAdCampaignUseCase {
  constructor(
    @Inject(ADS_REPOSITORY)
    private readonly ads: AdsRepositoryPort,
    @Inject(NOTIFICATION_PUBLISHER)
    private readonly notifications: NotificationPublisherPort,
  ) {}

  async execute(id: string, adminId: string): Promise<AdCampaignModel> {
    const campaign = await this.getPendingCampaign(id);
    const durationDays = campaign.package?.durationDays;
    if (!durationDays) {
      throw new AdPackageNotFoundError('Không tìm thấy gói quảng cáo của chiến dịch');
    }

    const approvedAt = new Date();
    const startDate = toDateString(approvedAt);
    const endDate = toDateString(
      new Date(approvedAt.getTime() + durationDays * 24 * 60 * 60 * 1000),
    );
    const saved = await this.ads.moderateCampaign(id, {
      status: AdStatus.ACTIVE,
      approvedBy: adminId,
      approvedAt,
      rejectionReason: null,
      startDate,
      endDate,
    });

    await this.notifications.publish({
      userId: saved.supplierId,
      type: NotifType.AD_APPROVED,
      title: 'Quảng cáo đã được duyệt',
      body: `Chiến dịch "${saved.title}" đang chạy đến ${endDate}.`,
      data: { campaignId: saved.id, status: saved.status, endDate },
    });
    return saved;
  }

  private async getPendingCampaign(id: string): Promise<AdCampaignModel> {
    const campaign = await this.ads.findCampaignById(id);
    if (!campaign) {
      throw new AdCampaignNotFoundError();
    }
    assertCampaignCanBeModerated(campaign.status);
    return campaign;
  }
}

@Injectable()
export class RejectAdCampaignUseCase {
  constructor(
    @Inject(ADS_REPOSITORY)
    private readonly ads: AdsRepositoryPort,
    @Inject(NOTIFICATION_PUBLISHER)
    private readonly notifications: NotificationPublisherPort,
  ) {}

  async execute(
    id: string,
    adminId: string,
    rejectionReason: string,
  ): Promise<AdCampaignModel> {
    const campaign = await this.ads.findCampaignById(id);
    if (!campaign) {
      throw new AdCampaignNotFoundError();
    }
    assertCampaignCanBeModerated(campaign.status);

    const saved = await this.ads.moderateCampaign(id, {
      status: AdStatus.REJECTED,
      approvedBy: adminId,
      approvedAt: new Date(),
      rejectionReason: rejectionReason.trim(),
      startDate: null,
      endDate: null,
    });
    await this.notifications.publish({
      userId: saved.supplierId,
      type: NotifType.AD_REJECTED,
      title: 'Quảng cáo bị từ chối',
      body: saved.rejectionReason ?? 'Chiến dịch chưa đáp ứng điều kiện phê duyệt.',
      data: {
        campaignId: saved.id,
        status: saved.status,
        rejectionReason: saved.rejectionReason,
      },
    });
    return saved;
  }
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
