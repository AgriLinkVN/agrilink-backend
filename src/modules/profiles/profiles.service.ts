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
    throw new Error('TODO: implement ProfilesService.getFarmerProfile()');
  }

  async upsertFarmerProfile(userId: string, dto: UpdateFarmerProfileDto): Promise<FarmerProfile> {
    throw new Error('TODO: implement ProfilesService.upsertFarmerProfile()');
  }

  async getCooperativeProfile(userId: string): Promise<CooperativeProfile | null> {
    throw new Error('TODO: implement ProfilesService.getCooperativeProfile()');
  }

  async upsertCooperativeProfile(userId: string, dto: UpdateCooperativeProfileDto): Promise<CooperativeProfile> {
    throw new Error('TODO: implement ProfilesService.upsertCooperativeProfile()');
  }

  async getEnterpriseProfile(userId: string): Promise<EnterpriseProfile | null> {
    throw new Error('TODO: implement ProfilesService.getEnterpriseProfile()');
  }

  async upsertEnterpriseProfile(userId: string, dto: UpdateEnterpriseProfileDto): Promise<EnterpriseProfile> {
    throw new Error('TODO: implement ProfilesService.upsertEnterpriseProfile()');
  }

  async getSupplierProfile(userId: string): Promise<SupplierProfile | null> {
    throw new Error('TODO: implement ProfilesService.getSupplierProfile()');
  }

  async upsertSupplierProfile(userId: string, dto: UpdateSupplierProfileDto): Promise<SupplierProfile> {
    throw new Error('TODO: implement ProfilesService.upsertSupplierProfile()');
  }
}
