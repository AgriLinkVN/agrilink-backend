import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesController } from './profiles.controller';
import { FarmPublicController } from './farm-public.controller';
import { ProfilesService } from './profiles.service';
import { FarmerProfile } from '../../database/entities/farmer-profile.entity';
import { CooperativeProfile } from '../../database/entities/cooperative-profile.entity';
import { EnterpriseProfile } from '../../database/entities/enterprise-profile.entity';
import { SupplierProfile } from '../../database/entities/supplier-profile.entity';
import { FptVisionService } from '../storage/application/fpt-vision.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FarmerProfile,
      CooperativeProfile,
      EnterpriseProfile,
      SupplierProfile,
    ]),
  ],
  controllers: [ProfilesController, FarmPublicController],
  providers: [ProfilesService, FptVisionService],
  exports: [ProfilesService],
})
export class ProfilesRoute {}
