import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesController } from './profiles.controller';
import { FarmPublicController } from './farm-public.controller';
import { ProfilesService } from './profiles.service';
import { FarmerProfile } from './entities/farmer-profile.entity';
import { CooperativeProfile } from './entities/cooperative-profile.entity';
import { EnterpriseProfile } from './entities/enterprise-profile.entity';
import { SupplierProfile } from './entities/supplier-profile.entity';

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
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
