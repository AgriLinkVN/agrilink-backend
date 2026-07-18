import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AdCampaignListResult,
  AdCampaignModel,
  AdCampaignPagination,
  AdPackageModel,
  CreateAdCampaignInput,
  NormalizedAdCampaignPagination,
  TrackAdEventInput,
} from '../../../application/models/ads.model';
import { AdsRepositoryPort } from '../../../application/ports/outbound/ads-repository.port';
import { AdCampaign } from '../entities/ad-campaign.entity';
import { AdEvent, AdEventType } from '../entities/ad-event.entity';
import { AdPackage } from '../entities/ad-package.entity';
import { AdStatus } from '@common/enums';

@Injectable()
export class TypeOrmAdsRepository implements AdsRepositoryPort {
  constructor(
    @InjectRepository(AdPackage)
    private readonly packages: Repository<AdPackage>,
    @InjectRepository(AdCampaign)
    private readonly campaigns: Repository<AdCampaign>,
    @InjectRepository(AdEvent)
    private readonly events: Repository<AdEvent>,
  ) {}

  async findActivePackages(): Promise<AdPackageModel[]> {
    const packages = await this.packages.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
    return packages.map((item) => this.toPackageModel(item));
  }

  async findActivePackageById(id: number): Promise<AdPackageModel | null> {
    const item = await this.packages.findOne({ where: { id, isActive: true } });
    return item ? this.toPackageModel(item) : null;
  }

  async createCampaign(
    supplierId: string,
    input: CreateAdCampaignInput,
  ): Promise<AdCampaignModel> {
    const created = this.campaigns.create({
      supplierId,
      packageId: input.packageId,
      title: input.title,
      imageUrl: input.imageUrl,
      linkUrl: input.linkUrl ?? null,
      targetProvinces: input.targetProvinces ?? [],
      status: AdStatus.PENDING_APPROVAL,
      rejectionReason: null,
      approvedBy: null,
      approvedAt: null,
      startDate: null,
      endDate: null,
      totalImpressions: 0,
      totalClicks: 0,
    });
    const saved = await this.campaigns.save(created);
    const campaign = await this.campaigns.findOne({
      where: { id: saved.id },
      relations: ['package'],
    });
    return this.toCampaignModel(campaign ?? saved);
  }

  async findCampaignsBySupplier(
    supplierId: string,
    pagination: AdCampaignPagination,
  ): Promise<AdCampaignListResult> {
    const { page, limit } = this.normalizePagination(pagination);
    const [campaigns, total] = await this.campaigns.findAndCount({
      where: { supplierId },
      relations: ['package'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: campaigns.map((campaign) => this.toCampaignModel(campaign)),
      total,
      page,
      limit,
    };
  }

  async findCampaignById(id: string): Promise<AdCampaignModel | null> {
    const campaign = await this.campaigns.findOne({
      where: { id },
      relations: ['package'],
    });
    return campaign ? this.toCampaignModel(campaign) : null;
  }

  async updateCampaignStatus(
    id: string,
    status: AdStatus,
  ): Promise<AdCampaignModel> {
    await this.campaigns.update({ id }, { status });
    const campaign = await this.findCampaignById(id);
    if (!campaign) {
      throw new Error('Campaign was not found after status update');
    }
    return campaign;
  }

  async findActiveBanners(provinceId?: number): Promise<AdCampaignModel[]> {
    const query = this.campaigns
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.package', 'package')
      .where('campaign.status = :status', { status: AdStatus.ACTIVE })
      .andWhere('(campaign.startDate IS NULL OR campaign.startDate <= CURRENT_DATE)')
      .andWhere('(campaign.endDate IS NULL OR campaign.endDate >= CURRENT_DATE)')
      .orderBy('campaign.createdAt', 'DESC')
      .take(3);

    if (provinceId !== undefined) {
      query.andWhere(
        '(cardinality(campaign.targetProvinces) = 0 OR :provinceId = ANY(campaign.targetProvinces))',
        { provinceId },
      );
    }

    const campaigns = await query.getMany();
    return campaigns.map((campaign) => this.toCampaignModel(campaign));
  }

  async recordEvent(input: TrackAdEventInput): Promise<void> {
    await this.events.save(
      this.events.create({
        campaignId: input.campaignId,
        eventType:
          input.eventType === 'impression'
            ? AdEventType.IMPRESSION
            : AdEventType.CLICK,
        userId: input.userId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      }),
    );
  }

  private normalizePagination(
    input: AdCampaignPagination,
  ): NormalizedAdCampaignPagination {
    const page = Number(input.page) > 0 ? Number(input.page) : 1;
    const limit = Number(input.limit) > 0 ? Math.min(Number(input.limit), 50) : 20;
    return { page, limit };
  }

  private toPackageModel(item: AdPackage): AdPackageModel {
    return {
      id: item.id,
      name: item.name,
      adType: item.adType,
      price: Number(item.price),
      durationDays: item.durationDays,
      maxImpressions: item.maxImpressions ?? null,
      description: item.description ?? null,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private toCampaignModel(item: AdCampaign): AdCampaignModel {
    return {
      id: item.id,
      supplierId: item.supplierId,
      packageId: item.packageId,
      title: item.title,
      imageUrl: item.imageUrl,
      linkUrl: item.linkUrl ?? null,
      targetProvinces: item.targetProvinces ?? [],
      status: item.status,
      rejectionReason: item.rejectionReason ?? null,
      startDate: item.startDate ?? null,
      endDate: item.endDate ?? null,
      totalImpressions: item.totalImpressions,
      totalClicks: item.totalClicks,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      package: item.package ? this.toPackageModel(item.package) : undefined,
    };
  }
}
