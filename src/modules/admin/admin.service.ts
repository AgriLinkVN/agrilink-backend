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
  ) {}

  async getPendingProfiles() {
    const farmers = await this.farmerRepo.find({ where: { isKycVerified: false } });
    const cooperatives = await this.cooperativeRepo.find({ where: { isVerified: false } });
    const enterprises = await this.enterpriseRepo.find({ where: { isVerified: false } });
    const suppliers = await this.supplierRepo.find({ where: { isVerified: false } });

    return {
      farmer: farmers,
      cooperative: cooperatives,
      enterprise: enterprises,
      supplier: suppliers,
    };
  }

  async verifyProfile(type: string, profileId: string, dto: VerifyProfileDto, adminId: string) {
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
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    profile[isVerifiedField] = dto.isApproved;
    profile.verifiedBy = adminId;
    profile.rejectionReason = dto.isApproved ? null : dto.rejectionReason;

    if (dto.isApproved) {
      profile.verifiedAt = new Date();
    }

    await repo.save(profile);
    return { success: true, profile };
  }

  async getSystemConfigs(): Promise<SystemConfig[]> {
    throw new Error('TODO: implement AdminService.getSystemConfigs()');
  }

  async updateSystemConfig(key: string, value: string, updatedBy: string): Promise<SystemConfig> {
    throw new Error('TODO: implement AdminService.updateSystemConfig()');
  }

  async getAuditLogs(pagination: PaginationDto): Promise<{ data: AuditLog[]; total: number }> {
    throw new Error('TODO: implement AdminService.getAuditLogs()');
  }

  /** Called by AuditLogInterceptor to persist log entries */
  async createAuditLog(data: Partial<AuditLog>): Promise<AuditLog> {
    throw new Error('TODO: implement AdminService.createAuditLog()');
  }
}
