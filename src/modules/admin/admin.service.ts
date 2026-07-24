import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { ProductStatus, UserStatus } from '../../common/enums';

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
      this.productRepo.count({ where: { status: ProductStatus.PENDING_APPROVAL } }),
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
        total: pendingFarmers + pendingCooperatives + pendingEnterprises + pendingSuppliers,
      },
      totalProducts,
      pendingProducts,
      openDisputes,
      certificationsThisMonth,
    };
  }

  async getPendingProfiles() {
    const [farmers, cooperatives, enterprises, suppliers] = await Promise.all([
      this.farmerRepo.find({ where: { isKycVerified: false }, relations: ['user'], order: { createdAt: 'DESC' } }),
      this.cooperativeRepo.find({ where: { isVerified: false }, relations: ['user'], order: { createdAt: 'DESC' } }),
      this.enterpriseRepo.find({ where: { isVerified: false }, relations: ['user'], order: { createdAt: 'DESC' } }),
      this.supplierRepo.find({ where: { isVerified: false }, relations: ['user'], order: { createdAt: 'DESC' } }),
    ]);

    return { farmer: farmers, cooperative: cooperatives, enterprise: enterprises, supplier: suppliers };
  }

  async verifyProfile(type: string, profileId: string, dto: VerifyProfileDto, adminId: string) {
    let repo: Repository<FarmerProfile | CooperativeProfile | EnterpriseProfile | SupplierProfile>;
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

    profile[isVerifiedField] = dto.isApproved;
    profile.verifiedBy = adminId;
    profile.rejectionReason = dto.isApproved ? null : (dto.rejectionReason ?? null);
    if (dto.isApproved) (profile as unknown as Record<string, unknown>).verifiedAt = new Date();

    await repo.save(profile);

    await this.createAuditLog({
      userId: adminId,
      action: dto.isApproved ? 'PROFILE_APPROVED' : 'PROFILE_REJECTED',
      entityType: type,
      entityId: profileId,
      changes: { isApproved: dto.isApproved, rejectionReason: dto.rejectionReason },
    });

    return { success: true, profile };
  }

  async getSystemConfigs(): Promise<SystemConfig[]> {
    return this.configRepo.find({ order: { key: 'ASC' } });
  }

  async updateSystemConfig(key: string, value: string, updatedBy: string): Promise<SystemConfig> {
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

  async getAuditLogs(pagination: PaginationDto): Promise<{ data: AuditLog[]; total: number }> {
    const [data, total] = await this.auditRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit ?? 20,
    });
    return { data, total };
  }

  async getDisputes(pagination: PaginationDto, status?: string): Promise<{ data: IncidentReport[]; total: number }> {
    const qb = this.incidentRepo.createQueryBuilder('ir').orderBy('ir.created_at', 'DESC');
    if (status) qb.where('ir.status = :status', { status });
    qb.skip(pagination.skip).take(pagination.limit ?? 20);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async updateDisputeStatus(id: string, status: string, adminId: string): Promise<IncidentReport> {
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

  async getPendingProducts(pagination: PaginationDto) {
    const [data, total] = await this.productRepo.findAndCount({
      where: { status: ProductStatus.PENDING_APPROVAL },
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit ?? 20,
    });
    return { data: await this.attachSellers(data), total };
  }

  /** Products suspended/rejected for policy violations — state agency oversight view */
  async getViolatingProducts(pagination: PaginationDto) {
    const [data, total] = await this.productRepo.findAndCount({
      where: [
        { status: ProductStatus.SUSPENDED },
        { status: ProductStatus.REJECTED },
      ],
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

  /** All verified cooperatives and enterprises — state agency oversight list */
  async getCooperativesAndEnterprises() {
    const [cooperatives, enterprises] = await Promise.all([
      this.cooperativeRepo.find({ relations: ['user'], order: { createdAt: 'DESC' } }),
      this.enterpriseRepo.find({ relations: ['user'], order: { createdAt: 'DESC' } }),
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
    const [stats, cooperativesEnterprises, violatingProducts] = await Promise.all([
      this.getStats(),
      this.getCooperativesAndEnterprises(),
      this.getViolatingProducts(pagination),
    ]);
    return { stats, cooperativesEnterprises, violatingProducts, generatedAt: new Date() };
  }
}
