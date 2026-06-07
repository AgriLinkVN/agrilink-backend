import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { CooperativeMember } from './entities/cooperative-member.entity';
import { BulkListing } from './entities/bulk-listing.entity';
import { BulkListingContribution } from './entities/bulk-listing-contribution.entity';
import { HarvestSchedule } from './entities/harvest-schedule.entity';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../admin/entities/audit-log.entity';
import {
  CreateBulkListingDto,
  UpdateBulkListingDto,
  BulkListingFilterDto,
} from './dto/create-bulk-listing.dto';
import {
  CreateHarvestScheduleDto,
  UpdateHarvestScheduleDto,
  RecordActualDto,
  HarvestFilterDto,
} from './dto/create-harvest-schedule.dto';
import {
  ContributeDto,
  UpdateContributionDto,
} from './dto/contribute.dto';
import {
  ApproveMemberDto,
  MemberFilterDto,
  RejectMemberDto,
  RequestJoinDto,
  SuspendMemberDto,
} from './dto/member.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  MemberStatus,
  ProductStatus,
  UserRole,
} from '../../common/enums';

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class CooperativesService {
  private readonly logger = new Logger(CooperativesService.name);

  constructor(
    @InjectRepository(CooperativeMember)
    private readonly memberRepo: Repository<CooperativeMember>,
    @InjectRepository(BulkListing)
    private readonly bulkRepo: Repository<BulkListing>,
    @InjectRepository(BulkListingContribution)
    private readonly contribRepo: Repository<BulkListingContribution>,
    @InjectRepository(HarvestSchedule)
    private readonly harvestRepo: Repository<HarvestSchedule>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  // ════════════════════════════════════════════════════════════════════════
  //  MEMBERS — join request / approve / reject / suspend / list
  // ════════════════════════════════════════════════════════════════════════

  /** Farmer requests to join a cooperative. */
  async requestJoin(
    farmerId: string,
    cooperativeId: string,
    dto: RequestJoinDto,
  ): Promise<CooperativeMember> {
    if (farmerId === cooperativeId) {
      throw new BadRequestException('Bạn không thể tự gia nhập chính mình');
    }

    const coop = await this.userRepo.findOne({ where: { id: cooperativeId } });
    if (!coop) throw new NotFoundException('HTX không tồn tại');
    if (coop.role !== UserRole.cooperative) {
      throw new BadRequestException('Tài khoản đích không phải HTX');
    }

    const farmer = await this.userRepo.findOne({ where: { id: farmerId } });
    if (!farmer) throw new NotFoundException('Tài khoản farmer không tồn tại');
    if (farmer.role !== UserRole.farmer) {
      throw new ForbiddenException('Chỉ tài khoản farmer mới có thể xin gia nhập HTX');
    }

    const existing = await this.memberRepo.findOne({
      where: { cooperativeId, farmerId },
    });
    if (existing && existing.status !== MemberStatus.left) {
      throw new ConflictException(
        `Bạn đã có yêu cầu hoặc đang là thành viên với trạng thái: ${existing.status}`,
      );
    }

    let member: CooperativeMember;
    if (existing) {
      existing.status = MemberStatus.pending;
      existing.joinRequestNote = dto.note ?? null;
      existing.approvedById = null;
      existing.approvedAt = null;
      existing.rejectedReason = null;
      member = await this.memberRepo.save(existing);
    } else {
      try {
        member = await this.memberRepo.save(
          this.memberRepo.create({
            cooperativeId,
            farmerId,
            status: MemberStatus.pending,
            joinRequestNote: dto.note ?? null,
          }),
        );
      } catch (err) {
        if (
          err instanceof QueryFailedError &&
          (err as { code?: string }).code === '23505'
        ) {
          throw new ConflictException('Bạn đã gửi yêu cầu trước đó');
        }
        throw err;
      }
    }

    try {
      await this.notificationsService.notifyMemberRequest(
        cooperativeId,
        { id: farmer.id, fullName: farmer.fullName ?? farmer.phone },
        coop.fullName ?? undefined,
      );
    } catch (err) {
      this.logger.error('notifyMemberRequest failed', err);
    }

    return member;
  }

  async listMembers(
    cooperativeId: string,
    filter: MemberFilterDto,
    page = 1,
    limit = 20,
  ): Promise<Paginated<CooperativeMember>> {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));

    const where: FindOptionsWhere<CooperativeMember> = { cooperativeId };
    if (filter.status) where.status = filter.status;

    const [data, total] = await this.memberRepo.findAndCount({
      where,
      relations: ['farmer'],
      select: {
        id: true,
        cooperativeId: true,
        farmerId: true,
        status: true,
        joinRequestNote: true,
        approvedAt: true,
        rejectedReason: true,
        createdAt: true,
        farmer: {
          id: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
        },
      },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return { data, total, page: safePage, limit: safeLimit };
  }

  async approveMember(
    cooperativeId: string,
    memberId: string,
    _dto: ApproveMemberDto,
  ): Promise<CooperativeMember> {
    const member = await this.requireOwnedMember(cooperativeId, memberId);
    if (member.status !== MemberStatus.pending) {
      throw new ConflictException(
        `Thành viên đang ở trạng thái "${member.status}", không thể duyệt`,
      );
    }

    member.status = MemberStatus.active;
    member.approvedById = cooperativeId;
    member.approvedAt = new Date();
    member.rejectedReason = null;
    const saved = await this.memberRepo.save(member);

    await this.refreshTotalMembers(cooperativeId);

    // Notify farmer + audit
    const coopName = await this.getUserName(cooperativeId);
    await this.tryNotify(() =>
      this.notificationsService.notifyMemberApproved(member.farmerId, coopName),
    );
    await this.writeAudit(cooperativeId, 'member_approved', memberId);

    return saved;
  }

  async rejectMember(
    cooperativeId: string,
    memberId: string,
    dto: RejectMemberDto,
  ): Promise<CooperativeMember> {
    const member = await this.requireOwnedMember(cooperativeId, memberId);
    if (member.status !== MemberStatus.pending) {
      throw new ConflictException(
        `Thành viên đang ở trạng thái "${member.status}", không thể từ chối`,
      );
    }
    member.rejectedReason = dto.reason;
    member.status = MemberStatus.left;
    member.approvedById = cooperativeId;
    member.approvedAt = new Date();
    const saved = await this.memberRepo.save(member);

    await this.refreshTotalMembers(cooperativeId);

    const coopName = await this.getUserName(cooperativeId);
    await this.tryNotify(() =>
      this.notificationsService.notifyMemberRejected(
        member.farmerId,
        coopName,
        dto.reason,
      ),
    );
    await this.writeAudit(cooperativeId, 'member_rejected', memberId, {
      reason: dto.reason,
    });

    return saved;
  }

  async suspendMember(
    cooperativeId: string,
    memberId: string,
    dto: SuspendMemberDto,
    force = false,
  ): Promise<CooperativeMember> {
    const member = await this.requireOwnedMember(cooperativeId, memberId);
    if (member.status !== MemberStatus.active) {
      throw new ConflictException(
        `Chỉ có thể tạm dừng thành viên active. Trạng thái hiện tại: ${member.status}`,
      );
    }
    if (!force) {
      const affected = await this.findActiveContributions(member.farmerId);
      if (affected.length > 0) {
        throw new ConflictException({
          code: 'MEMBER_HAS_ACTIVE_CONTRIBUTIONS',
          message: `Thành viên đang có ${affected.length} contribution trong bulk listing active. Gửi lại với ?force=true để xác nhận.`,
          affectedBulkListings: affected,
        });
      }
    }
    member.status = MemberStatus.suspended;
    member.rejectedReason = dto.reason ?? null;
    const saved = await this.memberRepo.save(member);

    await this.refreshTotalMembers(cooperativeId);

    const coopName = await this.getUserName(cooperativeId);
    await this.tryNotify(() =>
      this.notificationsService.notifyMemberSuspended(
        member.farmerId,
        coopName,
        dto.reason,
      ),
    );
    await this.writeAudit(cooperativeId, 'member_suspended', memberId, {
      reason: dto.reason ?? null,
    });

    return saved;
  }

  async reactivateMember(
    cooperativeId: string,
    memberId: string,
  ): Promise<CooperativeMember> {
    const member = await this.requireOwnedMember(cooperativeId, memberId);
    if (member.status !== MemberStatus.suspended) {
      throw new ConflictException(
        `Chỉ có thể kích hoạt lại thành viên đang suspended`,
      );
    }
    member.status = MemberStatus.active;
    member.rejectedReason = null;
    const saved = await this.memberRepo.save(member);

    await this.refreshTotalMembers(cooperativeId);

    const coopName = await this.getUserName(cooperativeId);
    await this.tryNotify(() =>
      this.notificationsService.notifyMemberReactivated(
        member.farmerId,
        coopName,
      ),
    );
    await this.writeAudit(cooperativeId, 'member_reactivated', memberId);

    return saved;
  }

  /** Farmer voluntarily leaves the cooperative. */
  async leaveCooperative(
    farmerId: string,
    cooperativeId: string,
    force = false,
  ): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { cooperativeId, farmerId, status: MemberStatus.active },
    });
    if (!member) throw new NotFoundException('Bạn không phải thành viên active');
    if (!force) {
      const affected = await this.findActiveContributions(farmerId);
      if (affected.length > 0) {
        throw new ConflictException({
          code: 'MEMBER_HAS_ACTIVE_CONTRIBUTIONS',
          message: `Bạn đang đóng góp vào ${affected.length} lô hàng đang active. Gửi lại với ?force=true để xác nhận rời HTX.`,
          affectedBulkListings: affected,
        });
      }
    }
    member.status = MemberStatus.left;
    await this.memberRepo.save(member);

    await this.refreshTotalMembers(cooperativeId);
    await this.writeAudit(farmerId, 'member_left', member.id);
  }

  /**
   * Returns bulk listings that are currently `active` AND have at least one
   * contribution from the given farmer. Used to warn HTX/farmer before
   * suspend/leave actions (BA addendum v2.1 §1.1, §1.3).
   */
  private async findActiveContributions(
    farmerId: string,
  ): Promise<Array<{ id: string; title: string; quantity: number; unit: string }>> {
    const rows = await this.contribRepo
      .createQueryBuilder('c')
      .innerJoin('c.bulkListing', 'b')
      .where('c.farmer_id = :farmerId', { farmerId })
      .andWhere('b.status = :status', { status: ProductStatus.active })
      .select([
        'b.id AS id',
        'b.title AS title',
        'c.quantity AS quantity',
        'c.unit AS unit',
      ])
      .getRawMany();
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      quantity: Number(r.quantity),
      unit: r.unit,
    }));
  }

  async listMyCooperatives(farmerId: string): Promise<CooperativeMember[]> {
    return this.memberRepo.find({
      where: { farmerId, status: MemberStatus.active },
      relations: ['cooperative'],
      select: {
        id: true,
        cooperativeId: true,
        status: true,
        approvedAt: true,
        cooperative: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  private async requireOwnedMember(
    cooperativeId: string,
    memberId: string,
  ): Promise<CooperativeMember> {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Thành viên không tồn tại');
    if (member.cooperativeId !== cooperativeId) {
      throw new ForbiddenException('Bạn không có quyền với thành viên này');
    }
    return member;
  }

  /**
   * Recompute the cooperative's active member count.
   * Called after every status change so cooperative_profiles.total_members
   * stays consistent (used by P1 admin dashboards).
   */
  private async refreshTotalMembers(cooperativeId: string): Promise<void> {
    try {
      await this.dataSource.query(
        `UPDATE cooperative_profiles
           SET total_members = (SELECT COUNT(*) FROM cooperative_members
                                  WHERE cooperative_id = $1 AND status = 'active')
         WHERE user_id = $1`,
        [cooperativeId],
      );
    } catch (err) {
      this.logger.warn(
        `refreshTotalMembers failed for ${cooperativeId}`,
        (err as Error).message,
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  BULK LISTINGS — CRUD + lifecycle
  // ════════════════════════════════════════════════════════════════════════

  async createBulkListing(
    cooperativeId: string,
    dto: CreateBulkListingDto,
  ): Promise<BulkListing> {
    if (dto.harvestDateFrom && dto.harvestDateTo) {
      if (new Date(dto.harvestDateFrom) > new Date(dto.harvestDateTo)) {
        throw new BadRequestException('Ngày bắt đầu phải ≤ ngày kết thúc thu hoạch');
      }
    }
    const listing = this.bulkRepo.create({
      cooperativeId,
      categoryId: dto.categoryId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      totalQuantity: dto.totalQuantity,
      unit: dto.unit,
      pricePerUnit: dto.pricePerUnit,
      farmingType: dto.farmingType ?? null,
      provinceId: dto.provinceId ?? null,
      harvestDateFrom: dto.harvestDateFrom ?? null,
      harvestDateTo: dto.harvestDateTo ?? null,
      status: ProductStatus.pending_approval,
    });
    return this.bulkRepo.save(listing);
  }

  async updateBulkListing(
    cooperativeId: string,
    id: string,
    dto: UpdateBulkListingDto,
  ): Promise<BulkListing> {
    const listing = await this.requireOwnedListing(cooperativeId, id);
    if (
      listing.status !== ProductStatus.draft &&
      listing.status !== ProductStatus.pending_approval
    ) {
      throw new ConflictException(
        `Chỉ có thể chỉnh sửa khi trạng thái là draft hoặc pending_approval`,
      );
    }
    Object.assign(listing, dto);
    return this.bulkRepo.save(listing);
  }

  async publishBulkListing(
    cooperativeId: string,
    id: string,
  ): Promise<BulkListing> {
    const listing = await this.requireOwnedListing(cooperativeId, id);
    if (listing.status !== ProductStatus.pending_approval) {
      throw new ConflictException('Chỉ pending_approval mới có thể publish');
    }
    listing.status = ProductStatus.active;
    return this.bulkRepo.save(listing);
  }

  async archiveBulkListing(
    cooperativeId: string,
    id: string,
  ): Promise<BulkListing> {
    const listing = await this.requireOwnedListing(cooperativeId, id);
    listing.status = ProductStatus.archived;
    return this.bulkRepo.save(listing);
  }

  async getBulkListingById(id: string): Promise<BulkListing> {
    const listing = await this.bulkRepo.findOne({
      where: { id },
      relations: ['cooperative', 'contributions', 'contributions.farmer'],
    });
    if (!listing) throw new NotFoundException('Bulk listing không tồn tại');
    return listing;
  }

  async listMyBulkListings(
    cooperativeId: string,
    filter: BulkListingFilterDto,
  ): Promise<Paginated<BulkListing>> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filter.limit) || 20));

    const qb = this.bulkRepo
      .createQueryBuilder('b')
      .where('b.cooperative_id = :coop', { coop: cooperativeId });

    if (filter.status) qb.andWhere('b.status = :status', { status: filter.status });
    if (filter.provinceId)
      qb.andWhere('b.province_id = :pid', { pid: filter.provinceId });
    if (filter.categoryId)
      qb.andWhere('b.category_id = :cid', { cid: filter.categoryId });
    if (filter.farmingType)
      qb.andWhere('b.farming_type = :ft', { ft: filter.farmingType });

    qb.orderBy('b.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async listPublicBulkListings(
    filter: BulkListingFilterDto,
  ): Promise<Paginated<BulkListing>> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filter.limit) || 20));

    const qb = this.bulkRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.cooperative', 'coop')
      .where('b.status = :status', { status: ProductStatus.active });

    if (filter.provinceId)
      qb.andWhere('b.province_id = :pid', { pid: filter.provinceId });
    if (filter.categoryId)
      qb.andWhere('b.category_id = :cid', { cid: filter.categoryId });
    if (filter.farmingType)
      qb.andWhere('b.farming_type = :ft', { ft: filter.farmingType });

    qb.orderBy('b.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  private async requireOwnedListing(
    cooperativeId: string,
    id: string,
  ): Promise<BulkListing> {
    const listing = await this.bulkRepo.findOne({ where: { id } });
    if (!listing) throw new NotFoundException('Bulk listing không tồn tại');
    if (listing.cooperativeId !== cooperativeId) {
      throw new ForbiddenException('Bạn không sở hữu bulk listing này');
    }
    return listing;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  CONTRIBUTIONS — farmers commit quantity to a bulk listing
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Contribute to a bulk listing — race-safe.
   * Uses a serializable transaction + row-level lock on the listing so that
   * concurrent contributors cannot collectively exceed `total_quantity`.
   */
  async contribute(
    farmerId: string,
    listingId: string,
    dto: ContributeDto,
  ): Promise<BulkListingContribution> {
    return this.dataSource.transaction(async (manager) => {
      // Row-level lock on the listing
      const listing = await manager
        .createQueryBuilder(BulkListing, 'b')
        .setLock('pessimistic_write')
        .where('b.id = :id', { id: listingId })
        .getOne();

      if (!listing) throw new NotFoundException('Bulk listing không tồn tại');
      if (listing.status !== ProductStatus.active) {
        throw new BadRequestException('Bulk listing không còn nhận đóng góp');
      }

      const member = await manager.findOne(CooperativeMember, {
        where: {
          cooperativeId: listing.cooperativeId,
          farmerId,
          status: MemberStatus.active,
        },
      });
      if (!member) {
        throw new ForbiddenException(
          'Chỉ thành viên active của HTX mới có thể đóng góp',
        );
      }

      const row = await manager
        .createQueryBuilder(BulkListingContribution, 'c')
        .select('COALESCE(SUM(c.quantity), 0)', 'sum')
        .where('c.bulk_listing_id = :id', { id: listingId })
        .getRawOne<{ sum: string }>();
      const currentSum = Number(row?.sum ?? 0);
      const remaining = Number(listing.totalQuantity) - currentSum;
      if (dto.quantity > remaining + 1e-6) {
        throw new BadRequestException(
          `Vượt quá hạn ngạch còn lại (${remaining.toFixed(2)} ${listing.unit})`,
        );
      }

      try {
        return await manager.save(
          manager.create(BulkListingContribution, {
            bulkListingId: listingId,
            farmerId,
            productId: dto.productId ?? null,
            quantity: dto.quantity,
            unit: dto.unit,
          }),
        );
      } catch (err) {
        if (
          err instanceof QueryFailedError &&
          (err as { code?: string }).code === '23505'
        ) {
          throw new ConflictException('Bạn đã đóng góp vào lô này rồi');
        }
        throw err;
      }
    });
  }

  async updateContribution(
    farmerId: string,
    contributionId: string,
    dto: UpdateContributionDto,
  ): Promise<BulkListingContribution> {
    return this.dataSource.transaction(async (manager) => {
      const c = await manager.findOne(BulkListingContribution, {
        where: { id: contributionId },
      });
      if (!c) throw new NotFoundException('Đóng góp không tồn tại');
      if (c.farmerId !== farmerId) {
        throw new ForbiddenException('Bạn không sở hữu đóng góp này');
      }

      if (dto.quantity !== undefined) {
        // Lock listing while checking remaining capacity
        const listing = await manager
          .createQueryBuilder(BulkListing, 'b')
          .setLock('pessimistic_write')
          .where('b.id = :id', { id: c.bulkListingId })
          .getOne();
        if (!listing) throw new NotFoundException('Bulk listing không tồn tại');

        const row = await manager
          .createQueryBuilder(BulkListingContribution, 'cc')
          .select('COALESCE(SUM(cc.quantity), 0)', 'sum')
          .where('cc.bulk_listing_id = :id AND cc.id <> :cid', {
            id: c.bulkListingId,
            cid: c.id,
          })
          .getRawOne<{ sum: string }>();
        const sumOthers = Number(row?.sum ?? 0);
        if (dto.quantity > Number(listing.totalQuantity) - sumOthers + 1e-6) {
          throw new BadRequestException('Vượt quá hạn ngạch còn lại');
        }
      }

      Object.assign(c, dto);
      return manager.save(c);
    });
  }

  async removeContribution(
    farmerId: string,
    contributionId: string,
  ): Promise<void> {
    const c = await this.contribRepo.findOne({ where: { id: contributionId } });
    if (!c) throw new NotFoundException('Đóng góp không tồn tại');
    if (c.farmerId !== farmerId) {
      throw new ForbiddenException('Bạn không sở hữu đóng góp này');
    }
    await this.contribRepo.remove(c);
  }

  async listContributions(
    listingId: string,
  ): Promise<BulkListingContribution[]> {
    return this.contribRepo.find({
      where: { bulkListingId: listingId },
      relations: ['farmer'],
      select: {
        id: true,
        farmerId: true,
        productId: true,
        quantity: true,
        unit: true,
        createdAt: true,
        farmer: { id: true, fullName: true, phone: true, avatarUrl: true },
      },
      order: { createdAt: 'ASC' },
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  HARVEST SCHEDULES
  // ════════════════════════════════════════════════════════════════════════

  async createHarvest(
    userId: string,
    userRole: UserRole,
    dto: CreateHarvestScheduleDto,
  ): Promise<HarvestSchedule> {
    if (new Date(dto.expectedDate) < new Date(new Date().toDateString())) {
      throw new BadRequestException('expectedDate phải ≥ hôm nay');
    }

    let farmerId: string;
    let cooperativeId: string | null = null;

    if (userRole === UserRole.cooperative) {
      if (!dto.farmerId) {
        throw new BadRequestException('cooperative phải chỉ định farmerId');
      }
      const member = await this.memberRepo.findOne({
        where: {
          cooperativeId: userId,
          farmerId: dto.farmerId,
          status: MemberStatus.active,
        },
      });
      if (!member) {
        throw new ForbiddenException(
          'farmerId chưa phải thành viên active của HTX',
        );
      }
      farmerId = dto.farmerId;
      cooperativeId = userId;
    } else if (userRole === UserRole.farmer) {
      farmerId = userId;
    } else {
      throw new ForbiddenException(
        'Chỉ farmer hoặc cooperative mới tạo được lịch thu hoạch',
      );
    }

    return this.harvestRepo.save(
      this.harvestRepo.create({
        cooperativeId,
        farmerId,
        productId: dto.productId ?? null,
        expectedDate: dto.expectedDate,
        estimatedQty: dto.estimatedQty ?? null,
        unit: dto.unit ?? null,
        note: dto.note ?? null,
      }),
    );
  }

  async updateHarvest(
    userId: string,
    id: string,
    dto: UpdateHarvestScheduleDto,
  ): Promise<HarvestSchedule> {
    const item = await this.requireHarvestOwner(userId, id);
    Object.assign(item, dto);
    return this.harvestRepo.save(item);
  }

  async recordActual(
    userId: string,
    id: string,
    dto: RecordActualDto,
  ): Promise<HarvestSchedule> {
    const item = await this.requireHarvestOwner(userId, id);
    item.actualDate = dto.actualDate;
    item.actualQty = dto.actualQty;
    if (dto.note) item.note = dto.note;
    return this.harvestRepo.save(item);
  }

  async removeHarvest(userId: string, id: string): Promise<void> {
    const item = await this.requireHarvestOwner(userId, id);
    await this.harvestRepo.remove(item);
  }

  async listHarvests(
    userId: string,
    userRole: UserRole,
    filter: HarvestFilterDto,
  ): Promise<Paginated<HarvestSchedule>> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 50));

    const where: FindOptionsWhere<HarvestSchedule> = {};
    if (userRole === UserRole.cooperative) where.cooperativeId = userId;
    else where.farmerId = userId;

    // Allow either bound to be specified independently
    if (filter.from && filter.to) {
      where.expectedDate = Between(filter.from, filter.to);
    } else if (filter.from) {
      where.expectedDate = MoreThanOrEqual(filter.from);
    } else if (filter.to) {
      where.expectedDate = LessThanOrEqual(filter.to);
    }

    const [data, total] = await this.harvestRepo.findAndCount({
      where,
      relations: ['farmer'],
      select: {
        id: true,
        cooperativeId: true,
        farmerId: true,
        productId: true,
        expectedDate: true,
        estimatedQty: true,
        unit: true,
        actualDate: true,
        actualQty: true,
        note: true,
        createdAt: true,
        farmer: { id: true, fullName: true, phone: true },
      },
      order: { expectedDate: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  private async requireHarvestOwner(
    userId: string,
    id: string,
  ): Promise<HarvestSchedule> {
    const item = await this.harvestRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Lịch thu hoạch không tồn tại');
    if (item.farmerId !== userId && item.cooperativeId !== userId) {
      throw new ForbiddenException('Bạn không có quyền với lịch này');
    }
    return item;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  REPORTS
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Aggregate production for a cooperative.
   * `from` and `to` are independent; either may be omitted.
   */
  async getProductionReport(
    cooperativeId: string,
    from?: string,
    to?: string,
  ): Promise<{
    totalEstimated: number;
    totalActual: number;
    byMember: Array<{
      farmerId: string;
      farmerName: string | null;
      estimated: number;
      actual: number;
    }>;
    byMonth: Array<{ month: string; estimated: number; actual: number }>;
  }> {
    const params: unknown[] = [cooperativeId];
    const conds: string[] = ['h.cooperative_id = $1'];
    if (from) {
      params.push(from);
      conds.push(`h.expected_date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conds.push(`h.expected_date <= $${params.length}`);
    }
    const where = conds.join(' AND ');

    const totalsRow = await this.dataSource.query<
      Array<{ est: string | null; act: string | null }>
    >(
      `SELECT COALESCE(SUM(estimated_qty),0) AS est,
              COALESCE(SUM(actual_qty),0)    AS act
         FROM harvest_schedules h
        WHERE ${where}`,
      params,
    );

    const byMember = await this.dataSource.query<
      Array<{
        farmer_id: string;
        full_name: string | null;
        est: string | null;
        act: string | null;
      }>
    >(
      `SELECT h.farmer_id, u.full_name,
              COALESCE(SUM(h.estimated_qty),0) AS est,
              COALESCE(SUM(h.actual_qty),0)    AS act
         FROM harvest_schedules h
         LEFT JOIN users u ON u.id = h.farmer_id
        WHERE ${where}
        GROUP BY h.farmer_id, u.full_name
        ORDER BY act DESC NULLS LAST`,
      params,
    );

    const byMonth = await this.dataSource.query<
      Array<{ month: string; est: string | null; act: string | null }>
    >(
      `SELECT TO_CHAR(h.expected_date, 'YYYY-MM') AS month,
              COALESCE(SUM(h.estimated_qty),0)    AS est,
              COALESCE(SUM(h.actual_qty),0)       AS act
         FROM harvest_schedules h
        WHERE ${where}
        GROUP BY month
        ORDER BY month ASC`,
      params,
    );

    return {
      totalEstimated: Number(totalsRow[0]?.est ?? 0),
      totalActual: Number(totalsRow[0]?.act ?? 0),
      byMember: byMember.map((r) => ({
        farmerId: r.farmer_id,
        farmerName: r.full_name,
        estimated: Number(r.est ?? 0),
        actual: Number(r.act ?? 0),
      })),
      byMonth: byMonth.map((r) => ({
        month: r.month,
        estimated: Number(r.est ?? 0),
        actual: Number(r.act ?? 0),
      })),
    };
  }

  async exportProductionReportCsv(
    cooperativeId: string,
    from?: string,
    to?: string,
  ): Promise<string> {
    const report = await this.getProductionReport(cooperativeId, from, to);
    const esc = (s: unknown) =>
      `"${String(s ?? '').replace(/"/g, '""')}"`;
    const lines: string[] = [];
    lines.push('TỔNG QUAN SẢN LƯỢNG');
    lines.push(`Tổng dự kiến,${report.totalEstimated}`);
    lines.push(`Tổng thực tế,${report.totalActual}`);
    lines.push('');
    lines.push('THEO THÀNH VIÊN');
    lines.push('farmer_id,full_name,estimated,actual');
    for (const r of report.byMember) {
      lines.push(
        `${r.farmerId},${esc(r.farmerName)},${r.estimated},${r.actual}`,
      );
    }
    lines.push('');
    lines.push('THEO THÁNG');
    lines.push('month,estimated,actual');
    for (const r of report.byMonth) {
      lines.push(`${r.month},${r.estimated},${r.actual}`);
    }
    return lines.join('\n');
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Helpers (audit + notification + name lookup)
  // ════════════════════════════════════════════════════════════════════════

  private async getUserName(userId: string): Promise<string> {
    const u = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, fullName: true, phone: true },
    });
    return u?.fullName ?? u?.phone ?? 'AgriLink';
  }

  /** Write an audit log entry; never throws — moderation must not be blocked. */
  private async writeAudit(
    actorId: string,
    action: string,
    entityId: string,
    changes?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          userId: actorId,
          action,
          entityType: 'cooperative_member',
          entityId,
          changes,
        }),
      );
    } catch (err) {
      this.logger.warn(`writeAudit "${action}" failed`, (err as Error).message);
    }
  }

  /** Wrap a notification call so a delivery failure doesn't bubble up. */
  private async tryNotify(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(`notification failed: ${(err as Error).message}`);
    }
  }
}
