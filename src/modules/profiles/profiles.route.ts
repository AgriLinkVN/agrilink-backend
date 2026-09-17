import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProfilesController } from "./profiles.controller";
import { FarmPublicController } from "./farm-public.controller";
import { ProfilesService } from "./profiles.service";
import { FarmerProfile } from "./infrastructure/persistence/entities/farmer-profile.entity";
import { CooperativeProfile } from "./infrastructure/persistence/entities/cooperative-profile.entity";
import { EnterpriseProfile } from "./infrastructure/persistence/entities/enterprise-profile.entity";
import { SupplierProfile } from "./infrastructure/persistence/entities/supplier-profile.entity";
import { FptVisionRoute } from "../../shared/fpt-vision/fpt-vision.route";
import { StorageModule } from "../storage/storage.module";
import {
  PROFILE_VERIFICATION_MANAGER,
  PROFILE_VERIFICATION_READER,
} from "./application/ports/inbound/profile-verification.port";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FarmerProfile,
      CooperativeProfile,
      EnterpriseProfile,
      SupplierProfile,
    ]),
    FptVisionRoute,
    StorageModule,
  ],
  controllers: [ProfilesController, FarmPublicController],
  providers: [
    ProfilesService,
    {
      provide: PROFILE_VERIFICATION_READER,
      useExisting: ProfilesService,
    },
    {
      provide: PROFILE_VERIFICATION_MANAGER,
      useExisting: ProfilesService,
    },
  ],
  exports: [PROFILE_VERIFICATION_READER, PROFILE_VERIFICATION_MANAGER],
})
export class ProfilesRoute {}
