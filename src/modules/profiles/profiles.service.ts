import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmerProfile } from './entities/farmer-profile.entity';
import { CooperativeProfile } from './entities/cooperative-profile.entity';
import { EnterpriseProfile } from './entities/enterprise-profile.entity';
import { SupplierProfile } from './entities/supplier-profile.entity';
import { UpdateFarmerProfileDto } from './dto/update-farmer-profile.dto';
import { UpdateCooperativeProfileDto } from './dto/update-cooperative-profile.dto';
import { UpdateEnterpriseProfileDto } from './dto/update-enterprise-profile.dto';
import { UpdateSupplierProfileDto } from './dto/update-supplier-profile.dto';

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
  ) {}

  async getFarmerProfile(userId: string): Promise<FarmerProfile | null> {
    return this.farmerRepo.findOne({ where: { userId } });
  }

  async upsertFarmerProfile(userId: string, dto: UpdateFarmerProfileDto): Promise<FarmerProfile> {
    let profile = await this.farmerRepo.findOne({ where: { userId } });
    if (profile) {
      Object.assign(profile, dto);
    } else {
      profile = this.farmerRepo.create({ userId, ...dto });
    }
    return this.farmerRepo.save(profile);
  }

  async getCooperativeProfile(userId: string): Promise<CooperativeProfile | null> {
    return this.cooperativeRepo.findOne({ where: { userId } });
  }

  async upsertCooperativeProfile(userId: string, dto: UpdateCooperativeProfileDto): Promise<CooperativeProfile> {
    let profile = await this.cooperativeRepo.findOne({ where: { userId } });
    if (profile) {
      Object.assign(profile, dto);
    } else {
      profile = this.cooperativeRepo.create({ userId, ...dto });
    }
    return this.cooperativeRepo.save(profile);
  }

  async getEnterpriseProfile(userId: string): Promise<EnterpriseProfile | null> {
    return this.enterpriseRepo.findOne({ where: { userId } });
  }

  async upsertEnterpriseProfile(userId: string, dto: UpdateEnterpriseProfileDto): Promise<EnterpriseProfile> {
    let profile = await this.enterpriseRepo.findOne({ where: { userId } });
    if (profile) {
      Object.assign(profile, dto);
    } else {
      profile = this.enterpriseRepo.create({ userId, ...dto });
    }
    return this.enterpriseRepo.save(profile);
  }

  async getSupplierProfile(userId: string): Promise<SupplierProfile | null> {
    return this.supplierRepo.findOne({ where: { userId } });
  }

  async upsertSupplierProfile(userId: string, dto: UpdateSupplierProfileDto): Promise<SupplierProfile> {
    let profile = await this.supplierRepo.findOne({ where: { userId } });
    if (profile) {
      Object.assign(profile, dto);
    } else {
      profile = this.supplierRepo.create({ userId, ...dto });
    }
    return this.supplierRepo.save(profile);
  }
}
