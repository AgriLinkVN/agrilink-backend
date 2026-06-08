import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { FarmerProfile } from '../../database/entities/farmer-profile.entity';
import { CooperativeProfile } from '../../database/entities/cooperative-profile.entity';
import { EnterpriseProfile } from '../../database/entities/enterprise-profile.entity';
import { SupplierProfile } from '../../database/entities/supplier-profile.entity';
import { FptVisionRoute } from '../../shared/fpt-vision/fpt-vision.route';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FarmerProfile,
      CooperativeProfile,
      EnterpriseProfile,
      SupplierProfile,
    ]),
    FptVisionRoute,
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesRoute {}
