import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SystemConfig } from './entities/system-config.entity';
import { AuditLog } from './entities/audit-log.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { VerifyProfileDto } from './dto/verify-profile.dto';
import { FarmerProfile } from '../../database/entities/farmer-profile.entity';
import { CooperativeProfile } from '../../database/entities/cooperative-profile.entity';
import { EnterpriseProfile } from '../../database/entities/enterprise-profile.entity';
import { SupplierProfile } from '../../database/entities/supplier-profile.entity';
import { User } from '../../database/entities/user.entity';
import { Product } from '../products/infrastructure/persistence/entities/product.entity';
import { IncidentReport } from '../../database/entities/incident-report.entity';
import { ProductStatus, UserRole, UserStatus } from '../../common/enums';
import {
  STORED_FILE_ACCESS,
  StorageReviewerRole,
  StoredFileAccessPort,
} from '../storage/application/ports/inbound/stored-file-access.port';

class ProfileReviewConsistencyError extends Error {}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(FarmerProfile)
    private readonly farmerRepo: Repository<FarmerProfile>,
    @InjectRepository(CooperativeProfile)
    private readonly cooperativeRepo: Repository<CooperativeProfile>,
    @InjectRepository(EnterpriseProfile)
    private readonly enterpriseRepo: Repository<EnterpriseProfile>,
    @InjectRepository(SupplierProfile)
    private readonly supplierRepo: Repository<SupplierProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(IncidentReport)
    private readonly incidentRepo: Repository<IncidentReport>,
    @Inject(STORED_FILE_ACCESS)
    private readonly storedFileAccess: StoredFileAccessPort,
  ) {}

  async getStats() {
    const [
      totalUsers,
      activeUsers,
      pendingFarmers,
      pendingCooperatives,
      pendingEnterprises,
      pendingSuppliers,
      totalProducts,
      pendingProducts,
      openDisputes,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { status: UserStatus.ACTIVE } }),
      this.farmerRepo.count({ where: { isKycVerified: false } }),
      this.cooperativeRepo.count({ where: { isVerified: false } }),
      this.enterpriseRepo.count({ where: { isVerified: false } }),
      this.supplierRepo.count({ where: { isVerified: false } }),
      this.productRepo.count(),
      this.productRepo.count({
        where: { status: ProductStatus.PENDING_APPROVAL },
      }),
      this.incidentRepo.count({ where: { status: 'open' } }),
    ]);

    // Certifications issued this month — count verified profiles updated this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const certificationsThisMonth = await this.cooperativeRepo
      .createQueryBuilder('cp')
      .where('cp.is_verified = true')
      .andWhere('cp.verified_at >= :monthStart', { monthStart })
      .getCount();

    return {
      totalUsers,
      activeUsers,
      pendingProfiles: {
        farmer: pendingFarmers,
        cooperative: pendingCooperatives,
        enterprise: pendingEnterprises,
        supplier: pendingSuppliers,
        total:
          pendingFarmers +
          pendingCooperatives +
          pendingEnterprises +
          pendingSuppliers,
      },
      totalProducts,
      pendingProducts,
      openDisputes,
      certificationsThisMonth,
    };
  }

  async getPendingProfiles() {
    const [farmers, cooperatives, enterprises, suppliers] = await Promise.all([
      this.farmerRepo.find({
        where: { isKycVerified: false },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      }),
      this.cooperativeRepo.find({
        where: { isVerified: false },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      }),
      this.enterpriseRepo.find({
        where: { isVerified: false },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      }),
      this.supplierRepo.find({
        where: { isVerified: false },
        order: { createdAt: 'DESC' },
      }),
    ]);

    // Attach user info for suppliers (no relation, uses userId column)
    if (suppliers.length > 0) {
      const supplierUserIds = [...new Set(suppliers.map(s => s.userId).filter(Boolean))] as string[];
      const supplierUsers = supplierUserIds.length > 0
        ? await this.userRepo.findBy({ id: In(supplierUserIds) })
        : [];
      const userById = new Map(supplierUsers.map(u => [u.id, u]));
      for (const s of suppliers) {
        (s as unknown as Record<string, unknown>).user = userById.get(s.userId) ?? null;
      }
    }

    return {
      farmer: farmers,
      cooperative: cooperatives,
      enterprise: enterprises,
      supplier: suppliers,
    };
  }

  async verifyProfile(
    type: string,
    profileId: string,
    dto: VerifyProfileDto,
    adminId: string,
    reviewerRole: StorageReviewerRole,
  ) {
    let repo: Repository<any>;
    let isVerifiedField = 'isVerified';

    switch (type) {
      case 'farmer':
        repo = this.farmerRepo;
        isVerifiedField = 'isKycVerified';
        break;
      case 'cooperative':
        repo = this.cooperativeRepo;
        break;
      case 'enterprise':
        repo = this.enterpriseRepo;
        break;
      case 'supplier':
        repo = this.supplierRepo;
        break;
      default:
        throw new BadRequestException('Invalid profile type');
    }

    const profile = await repo.findOne({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const previousState = {
      [isVerifiedField]: profile[isVerifiedField],
      verifiedBy: profile.verifiedBy,
      verifiedAt: profile.verifiedAt,
      rejectionReason: profile.rejectionReason,
    };
    profile[isVerifiedField] = dto.isApproved;
    profile.verifiedBy = adminId;
    profile.verifiedAt = dto.isApproved ? new Date() : null;
    profile.rejectionReason = dto.isApproved
      ? null
      : (dto.rejectionReason ?? null);

    await repo.save(profile);
    const transitionedFileIds: string[] = [];
    try {
      for (const fileId of this.getProfileStoredFileIds(profile)) {
        const changed = await this.storedFileAccess.reviewFile({
          fileId,
          reviewerRole,
          approve: dto.isApproved,
        });
        if (changed) transitionedFileIds.push(fileId);
      }
    } catch (error) {
      const storageCompensation = await Promise.allSettled(
        transitionedFileIds.map((fileId) =>
          this.storedFileAccess.restoreReviewedFile({
            fileId,
            reviewerRole,
          }),
        ),
      );
      Object.assign(profile, previousState);
      let profileCompensationFailed = false;
      try {
        await repo.save(profile);
      } catch {
        profileCompensationFailed = true;
      }
      if (
        profileCompensationFailed ||
        storageCompensation.some((result) => result.status === 'rejected')
      ) {
        throw new ProfileReviewConsistencyError(
          'Profile review compensation failed and requires reconciliation',
        );
      }
      throw error;
    }

    await this.createAuditLog({
      userId: adminId,
      action: dto.isApproved ? 'PROFILE_APPROVED' : 'PROFILE_REJECTED',
      entityType: type,
      entityId: profileId,
      changes: {
        isApproved: dto.isApproved,
        rejectionReason: dto.rejectionReason,
      },
    });

    return { success: true, profile };
  }

  private getProfileStoredFileIds(profile: Record<string, unknown>): string[] {
    const fields = [
      'cccdFrontFileId',
      'cccdBackFileId',
      'cooperativeCertFileId',
      'businessLicenseFileId',
      'representativeCccdFrontFileId',
      'representativeCccdBackFileId',
      'membersListFileId',
    ];
    return fields
      .map((field) => profile[field])
      .filter((value): value is string => typeof value === 'string');
  }

  async getSystemConfigs(): Promise<SystemConfig[]> {
    return this.configRepo.find({ order: { key: 'ASC' } });
  }

  async updateSystemConfig(
    key: string,
    value: string,
    updatedBy: string,
  ): Promise<SystemConfig> {
    let config = await this.configRepo.findOne({ where: { key } });
    if (!config) {
      config = this.configRepo.create({ key, value, updatedBy });
    } else {
      config.value = value;
      config.updatedBy = updatedBy;
    }
    const saved = await this.configRepo.save(config);
    await this.createAuditLog({
      userId: updatedBy,
      action: 'SYSTEM_CONFIG_UPDATE',
      entityType: 'SystemConfig',
      entityId: saved.id,
      changes: { key, value },
    });
    return saved;
  }

  async getAuditLogs(
    pagination: PaginationDto,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const [data, total] = await this.auditRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit ?? 20,
    });
    return { data, total };
  }

  async getDisputes(
    pagination: PaginationDto,
    status?: string,
  ): Promise<{ data: IncidentReport[]; total: number }> {
    const qb = this.incidentRepo
      .createQueryBuilder('ir')
      .orderBy('ir.created_at', 'DESC');
    if (status) qb.where('ir.status = :status', { status });
    qb.skip(pagination.skip).take(pagination.limit ?? 20);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async updateDisputeStatus(
    id: string,
    status: string,
    adminId: string,
  ): Promise<IncidentReport> {
    const report = await this.incidentRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Incident report not found');
    report.status = status;
    if (status === 'resolved') report.resolvedAt = new Date();
    const saved = await this.incidentRepo.save(report);
    await this.createAuditLog({
      userId: adminId,
      action: 'DISPUTE_STATUS_UPDATE',
      entityType: 'IncidentReport',
      entityId: id,
      changes: { status },
    });
    return saved;
  }

  async getProductDetail(id: string) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['images', 'certifications'],
    });
    if (!product) throw new NotFoundException('Product not found');
    const sellers = await this.userRepo.findByIds([product.sellerId]);
    return { ...product, seller: sellers[0] ? { fullName: sellers[0].fullName } : null };
  }

  async getPendingProducts(pagination: PaginationDto) {
    const [data, total] = await this.productRepo.findAndCount({
      where: { status: ProductStatus.PENDING_APPROVAL },
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit ?? 20,
    });
    return { data: await this.attachSellers(data), total };
  }

  async updateProductStatus(
    id: string,
    status: string,
    reason: string,
    adminId: string,
  ) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    const validStatuses = [ProductStatus.ACTIVE, ProductStatus.REJECTED, ProductStatus.SUSPENDED];
    if (!validStatuses.includes(status as ProductStatus)) {
      throw new BadRequestException('Invalid status. Allowed: active, rejected, suspended');
    }

    const previousStatus = product.status;
    product.status = status as ProductStatus;
    product.rejectionReason = status === ProductStatus.REJECTED ? (reason ?? null) : null;
    await this.productRepo.save(product);

    await this.createAuditLog({
      userId: adminId,
      action: 'PRODUCT_STATUS_UPDATE',
      entityType: 'Product',
      entityId: id,
      changes: { previousStatus, status, reason },
    });

    return product;
  }

  /** Products suspended/rejected for policy violations — state agency oversight view */
  async getViolatingProducts(pagination: PaginationDto) {
    const [data, total] = await this.productRepo.findAndCount({
      where: [{ status: 'suspended' as any }, { status: 'rejected' as any }],
      order: { updatedAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit ?? 20,
    });
    return { data: await this.attachSellers(data), total };
  }

  private async attachSellers(products: Product[]) {
    const sellerIds = [...new Set(products.map((p) => p.sellerId))];
    if (sellerIds.length === 0) return products;

    const sellers = await this.userRepo.findByIds(sellerIds);
    const sellerById = new Map(sellers.map((s) => [s.id, s]));

    return products.map((p) => ({
      ...p,
      seller: sellerById.get(p.sellerId)
        ? { fullName: sellerById.get(p.sellerId)!.fullName }
        : null,
    }));
  }

  // ─── User management ──────────────────────────────────────────────

  async getUsers(pagination: PaginationDto) {
    const [data, total] = await this.userRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit ?? 20,
    });
    return { data: data.map(({ passwordHash: _, ...u }) => u), total };
  }

  async toggleUserStatus(id: string, adminId: string, status: UserStatus) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.ADMIN) throw new BadRequestException('Cannot modify admin users');

    const previousStatus = user.status;
    user.status = status;
    await this.userRepo.save(user);

    await this.createAuditLog({
      userId: adminId,
      action: status === UserStatus.ACTIVE ? 'USER_UNLOCKED' : 'USER_LOCKED',
      entityType: 'User',
      entityId: id,
      changes: { previousStatus, status },
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  /** All verified cooperatives and enterprises — state agency oversight list */
  async getCooperativesAndEnterprises() {
    const [cooperatives, enterprises] = await Promise.all([
      this.cooperativeRepo.find({
        relations: ['user'],
        order: { createdAt: 'DESC' },
      }),
      this.enterpriseRepo.find({
        relations: ['user'],
        order: { createdAt: 'DESC' },
      }),
    ]);
    return { cooperatives, enterprises };
  }

  async createAuditLog(data: Partial<AuditLog>): Promise<AuditLog> {
    return this.auditRepo.save(this.auditRepo.create(data));
  }

  /** Snapshot of system-wide data for the state-agency PDF report */
  async getSystemReportData() {
    const pagination = new PaginationDto();
    pagination.limit = 20;
    const [stats, cooperativesEnterprises, violatingProducts] =
      await Promise.all([
        this.getStats(),
        this.getCooperativesAndEnterprises(),
        this.getViolatingProducts(pagination),
      ]);
    return {
      stats,
      cooperativesEnterprises,
      violatingProducts,
      generatedAt: new Date(),
    };
  }
}
