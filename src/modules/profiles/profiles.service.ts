import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmerProfile } from '../../database/entities/farmer-profile.entity';
import { CooperativeProfile } from '../../database/entities/cooperative-profile.entity';
import { EnterpriseProfile } from '../../database/entities/enterprise-profile.entity';
import { SupplierProfile } from '../../database/entities/supplier-profile.entity';
import { UpsertFarmerProfileDto } from './dto/upsert-farmer-profile.dto';
import { UpsertB2bProfileDto } from './dto/upsert-b2b-profile.dto';
import { FptVisionService } from '../storage/application/fpt-vision.service';
import { UserRole } from '../../common/enums';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(FarmerProfile)
    private readonly farmerRepo: Repository<FarmerProfile>,
    @InjectRepository(CooperativeProfile)
    private readonly cooperativeRepo: Repository<CooperativeProfile>,
    @InjectRepository(EnterpriseProfile)
    private readonly enterpriseRepo: Repository<EnterpriseProfile>,
    @InjectRepository(SupplierProfile)
    private readonly supplierRepo: Repository<SupplierProfile>,
    private readonly fptVisionService: FptVisionService,
  ) {}

  async getFarmerProfile(userId: string): Promise<FarmerProfile | null> {
    return this.farmerRepo.findOne({ where: { user: { id: userId } } });
  }

  async upsertFarmerProfile(userId: string, dto: UpsertFarmerProfileDto): Promise<FarmerProfile> {
    // 1. Verify CCCD both sides using FPT AI Vision
    let cccdData: any = null;
    if (dto.cccdFrontUrl && dto.cccdBackUrl) {
      cccdData = await this.fptVisionService.verifyCccdFull(dto.cccdFrontUrl, dto.cccdBackUrl);
    } else if (dto.cccdFrontUrl) {
      cccdData = await this.fptVisionService.verifyCccd(dto.cccdFrontUrl);
    }

    // 2. Check if profile exists
    let profile = await this.farmerRepo.findOne({ where: { user: { id: userId } } });

    if (!profile) {
      profile = this.farmerRepo.create({ user: { id: userId } });
    }

    // 3. Update fields
    Object.assign(profile, dto);

    // 4. Force KYC to false on modification
    profile.isKycVerified = false;

    // 5. Save
    return this.farmerRepo.save(profile);
  }

  async upsertB2bProfile(userId: string, role: UserRole, dto: UpsertB2bProfileDto) {
    if (role === UserRole.COOPERATIVE) {
      let profile = await this.cooperativeRepo.findOne({ where: { user: { id: userId } } });
      if (!profile) profile = this.cooperativeRepo.create({ user: { id: userId } });

      Object.assign(profile, dto);
      profile.isVerified = false;
      return this.cooperativeRepo.save(profile);
    }

    if (role === UserRole.ENTERPRISE) {
      let profile = await this.enterpriseRepo.findOne({ where: { user: { id: userId } } });
      if (!profile) profile = this.enterpriseRepo.create({ user: { id: userId } });

      Object.assign(profile, dto);
      profile.isVerified = false;
      return this.enterpriseRepo.save(profile);
    }

    if (role === UserRole.SUPPLIER) {
      let profile = await this.supplierRepo.findOne({ where: { userId } });
      if (!profile) profile = this.supplierRepo.create({ userId });

      Object.assign(profile, dto);
      profile.isVerified = false;
      return this.supplierRepo.save(profile);
    }

    throw new BadRequestException('Invalid B2B role');
  }
}
