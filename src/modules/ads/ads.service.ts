import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.provider';
import { addDays, format } from 'date-fns';
import { AdPackage } from './entities/ad-package.entity';
import { AdCampaign } from './entities/ad-campaign.entity';
import { AdEvent, AdEventType } from './entities/ad-event.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLog } from '../admin/entities/audit-log.entity';
import { AdStatus, AdType, NotifType } from '../../common/enums';

export interface CreatePackageDto {
  name: string;
  adType: AdType | 'banner' | 'featured' | 'spotlight';
  price: number;
  durationDays: number;
  maxImpressions?: number | null;
  description?: string | null;
}

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(
    @InjectRepository(AdPackage)
    private readonly packageRepo: Repository<AdPackage>,
    @InjectRepository(AdCampaign)
    private readonly campaignRepo: Repository<AdCampaign>,
    @InjectRepository(AdEvent)
    private readonly eventRepo: Repository<AdEvent>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly notificationsService: NotificationsService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  // ── Packages ──────────────────────────────────────────────────────────────

  async getPackages(): Promise<AdPackage[]> {
    return this.packageRepo.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }

  // ── Admin: Package CRUD ───────────────────────────────────────────────────

  async getAllPackages(): Promise<AdPackage[]> {
    return this.packageRepo.find({ order: { price: 'ASC' } });
  }

  async createPackage(dto: CreatePackageDto): Promise<AdPackage> {
    const entity = this.packageRepo.create({
      ...dto,
      adType: dto.adType as AdType,
    });
    return this.packageRepo.save(entity);
  }

  async updatePackage(
    id: string,
    dto: Partial<CreatePackageDto> & { isActive?: boolean },
  ): Promise<AdPackage> {
    const pkg = await this.packageRepo.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException(`Gói "${id}" không tồn tại`);
    Object.assign(pkg, dto);
    return this.packageRepo.save(pkg);
  }

  async deactivatePackage(id: string): Promise<AdPackage> {
    const pkg = await this.packageRepo.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException(`Gói "${id}" không tồn tại`);
    pkg.isActive = false;
    return this.packageRepo.save(pkg);
  }

  // ── Supplier: Campaign Management ─────────────────────────────────────────

  async createCampaign(
    supplierId: string,
    dto: CreateCampaignDto,
  ): Promise<AdCampaign> {
    const pkg = await this.packageRepo.findOne({
      where: { id: dto.packageId, isActive: true },
    });
    if (!pkg) {
      throw new NotFoundException(`Gói quảng cáo "${dto.packageId}" không tồn tại hoặc đã bị vô hiệu hóa`);
    }

    const campaign = this.campaignRepo.create({
      advertiserId: supplierId,
      packageId: dto.packageId,
      title: dto.title,
      bannerUrl: dto.imageUrl,
      targetUrl: dto.linkUrl,
      targetProvinces: dto.targetProvinces ?? [],
      status: AdStatus.pending_approval,
    });

    const saved = await this.campaignRepo.save(campaign);
    return this.campaignRepo.findOne({
      where: { id: saved.id },
      relations: ['package'],
    }) as Promise<AdCampaign>;
  }

  async getCampaignsBySupplier(
    supplierId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: AdCampaign[]; total: number; page: number; limit: number }> {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
    const [data, total] = await this.campaignRepo.findAndCount({
      where: { advertiserId: supplierId },
      relations: ['package'],
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return { data, total, page: safePage, limit: safeLimit };
  }

  async getCampaignDetail(
    id: string,
    supplierId: string,
  ): Promise<AdCampaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id, advertiserId: supplierId },
      relations: ['package'],
    });
    if (!campaign) {
      throw new NotFoundException(`Chiến dịch "${id}" không tồn tại`);
    }
    return campaign;
  }

  async pauseCampaign(id: string, supplierId: string): Promise<AdCampaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id, advertiserId: supplierId },
    });
    if (!campaign) {
      throw new NotFoundException(`Chiến dịch "${id}" không tồn tại`);
    }
    if (campaign.status !== AdStatus.active) {
      throw new BadRequestException(
        `Chỉ có thể tạm dừng chiến dịch đang chạy. Trạng thái hiện tại: ${campaign.status}`,
      );
    }
    campaign.status = AdStatus.paused;
    return this.campaignRepo.save(campaign);
  }

  async resumeCampaign(id: string, supplierId: string): Promise<AdCampaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id, advertiserId: supplierId },
    });
    if (!campaign) {
      throw new NotFoundException(`Chiến dịch "${id}" không tồn tại`);
    }
    if (campaign.status !== AdStatus.paused) {
      throw new BadRequestException(
        `Chỉ có thể tiếp tục chiến dịch đang tạm dừng. Trạng thái hiện tại: ${campaign.status}`,
      );
    }
    campaign.status = AdStatus.active;
    return this.campaignRepo.save(campaign);
  }

  // ── Admin: Campaign Moderation ─────────────────────────────────────────────

  async getCampaignsAdmin(filters: {
    status?: AdStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: AdCampaign[]; total: number; page: number; limit: number }> {
    const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
    const limit = Number(filters.limit) > 0 ? Math.min(Number(filters.limit), 50) : 20;

    const qb = this.campaignRepo
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.package', 'package')
      .orderBy('campaign.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.status) {
      qb.where('campaign.status = :status', { status: filters.status });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getCampaignAdminDetail(id: string): Promise<AdCampaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id },
      relations: ['package'],
    });
    if (!campaign) {
      throw new NotFoundException(`Chiến dịch "${id}" không tồn tại`);
    }
    return campaign;
  }

  async approveCampaign(id: string, adminId: string): Promise<AdCampaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id },
      relations: ['package'],
    });
    if (!campaign) {
      throw new NotFoundException(`Chiến dịch "${id}" không tồn tại`);
    }
    if (campaign.status !== AdStatus.pending_approval) {
      throw new ConflictException(
        `Chiến dịch đang ở trạng thái "${campaign.status}", không thể duyệt`,
      );
    }

    const now = new Date();
    const endDate = addDays(now, campaign.package.durationDays);
    const endDateStr = format(endDate, 'dd/MM/yyyy');

    campaign.status = AdStatus.active;
    campaign.approvedById = adminId;
    campaign.approvedAt = now;
    campaign.startsAt = now;
    campaign.endsAt = endDate;

    const saved = await this.campaignRepo.save(campaign);

    // Realtime notification + audit log — sequential awaits so failures are surfaced
    try {
      await this.notificationsService.createAndEmit({
        userId: campaign.advertiserId,
        type: NotifType.ad_approved,
        title: 'Quảng cáo đã được duyệt!',
        body: `Chiến dịch "${campaign.title}" đang chạy đến ${endDateStr}`,
        data: { campaignId: campaign.id },
      });
    } catch (err) {
      this.logger.error('Approve notification failed', err);
    }

    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          userId: adminId,
          action: 'ad_approved',
          entityType: 'ad_campaign',
          entityId: id,
        }),
      );
    } catch (err) {
      this.logger.error('Audit log failed', err);
    }

    this.logger.log(`Campaign "${id}" approved by admin "${adminId}"`);
    return saved;
  }

  async rejectCampaign(
    id: string,
    adminId: string,
    reason: string,
  ): Promise<AdCampaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Chiến dịch "${id}" không tồn tại`);
    }
    if (campaign.status !== AdStatus.pending_approval) {
      throw new ConflictException(
        `Chiến dịch đang ở trạng thái "${campaign.status}", không thể từ chối`,
      );
    }

    campaign.status = AdStatus.rejected;
    campaign.rejectionReason = reason;
    campaign.approvedById = adminId;
    campaign.approvedAt = new Date();

    const saved = await this.campaignRepo.save(campaign);

    try {
      await this.notificationsService.createAndEmit({
        userId: campaign.advertiserId,
        type: NotifType.ad_rejected,
        title: 'Quảng cáo bị từ chối',
        body: reason,
        data: { campaignId: campaign.id },
      });
    } catch (err) {
      this.logger.error('Reject notification failed', err);
    }

    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          userId: adminId,
          action: 'ad_rejected',
          entityType: 'ad_campaign',
          entityId: id,
        }),
      );
    } catch (err) {
      this.logger.error('Audit log failed', err);
    }

    this.logger.log(`Campaign "${id}" rejected by admin "${adminId}"`);
    return saved;
  }

  // ── Event Tracking (Redis rate-limited) ───────────────────────────────────

  /**
   * Track an ad impression or click.
   * NOTE: `userId` is no longer accepted from the client (anti-spoofing).
   * Callers that need the authenticated user must pass it from `request.user`.
   */
  async trackEvent(dto: {
    campaignId: string;
    eventType: 'impression' | 'click';
    userId?: string | null; // server-set only
    ipAddress: string;
    userAgent: string;
  }): Promise<void> {
    const { campaignId, eventType, userId, ipAddress, userAgent } = dto;

    // Verify campaign exists and is active — silently skip otherwise
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign || campaign.status !== AdStatus.active) return;

    // Redis rate-limit: 1 impression per (campaign, IP) per hour
    if (eventType === 'impression') {
      const key = `ad_imp:${campaignId}:${ipAddress}`;
      try {
        // SET NX EX = atomic "set if not exists with TTL"
        const setResult = await this.redis.set(key, '1', 'EX', 3600, 'NX');
        if (setResult === null) return; // key existed → duplicate
      } catch {
        this.logger.warn(`Redis down; skipping rate-limit check for ${key}`);
      }
    }

    await this.eventRepo.save(
      this.eventRepo.create({
        campaignId,
        eventType: eventType as AdEventType,
        userId: userId ?? undefined,
        ipAddress,
        userAgent,
      }),
    );

    if (eventType === 'impression') {
      await this.campaignRepo.increment({ id: campaignId }, 'impressionCount', 1);
    } else {
      await this.campaignRepo.increment({ id: campaignId }, 'clickCount', 1);
    }
  }

  // ── Public: Active Banners (province-aware + max_impressions check) ────────

  async getActiveBanners(provinceId?: number): Promise<AdCampaign[]> {
    const qb = this.campaignRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.package', 'pkg')
      .where('c.status = :status', { status: AdStatus.active })
      .andWhere('c.starts_at <= NOW()')
      .andWhere('c.ends_at >= NOW()')
      // max_impressions guard: null means unlimited
      .andWhere(
        '(pkg.max_impressions IS NULL OR c.impression_count < pkg.max_impressions)',
      )
      .orderBy('RANDOM()')
      .take(3);

    if (provinceId != null) {
      // Match nationwide ([] / null) OR campaigns that include this province
      qb.andWhere(
        `(
          c.target_provinces IS NULL
          OR c.target_provinces = '[]'::jsonb
          OR c.target_provinces @> :pArr::jsonb
        )`,
        { pArr: JSON.stringify([provinceId]) },
      );
    }

    return qb.getMany();
  }

  // ── Supplier: Analytics ────────────────────────────────────────────────────

  async getCampaignAnalytics(
    campaignId: string,
    supplierId: string,
  ): Promise<{
    campaign: AdCampaign;
    daily: Array<{ date: string; impressions: number; clicks: number }>;
    ctr: number;
    daysLeft: number;
  }> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId, advertiserId: supplierId },
      relations: ['package'],
    });
    if (!campaign) {
      throw new NotFoundException(`Chiến dịch "${campaignId}" không tồn tại`);
    }

    const dailyRows = await this.eventRepo
      .createQueryBuilder('e')
      .select(`TO_CHAR(e.created_at, 'YYYY-MM-DD')`, 'date')
      .addSelect(`COUNT(*) FILTER (WHERE e.event_type = 'impression')`, 'impressions')
      .addSelect(`COUNT(*) FILTER (WHERE e.event_type = 'click')`, 'clicks')
      .where('e.campaign_id = :id', { id: campaignId })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; impressions: string; clicks: string }>();

    const daily = dailyRows.map((r) => ({
      date: r.date,
      impressions: Number(r.impressions),
      clicks: Number(r.clicks),
    }));

    const ctr =
      campaign.impressionCount > 0
        ? Math.round((campaign.clickCount / campaign.impressionCount) * 10000) / 100
        : 0;

    const daysLeft = campaign.endsAt
      ? Math.max(0, Math.ceil((new Date(campaign.endsAt).getTime() - Date.now()) / 86400000))
      : 0;

    return { campaign, daily, ctr, daysLeft };
  }

  // ── Cron: Expire campaigns daily at 02:00 ─────────────────────────────────

  @Cron('0 2 * * *', { name: 'expire-campaigns' })
  async expireCampaigns(): Promise<void> {
    const result = await this.campaignRepo
      .createQueryBuilder()
      .update(AdCampaign)
      .set({ status: AdStatus.expired })
      .where('status = :active', { active: AdStatus.active })
      .andWhere('ends_at < NOW()')
      .execute();

    this.logger.log(`Expired ${result.affected ?? 0} campaign(s)`);
  }
}
