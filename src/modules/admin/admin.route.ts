import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SystemConfig } from './entities/system-config.entity';
import { AuditLog } from './entities/audit-log.entity';
import { FarmerProfile } from '../../database/entities/farmer-profile.entity';
import { CooperativeProfile } from '../../database/entities/cooperative-profile.entity';
import { EnterpriseProfile } from '../../database/entities/enterprise-profile.entity';
import { SupplierProfile } from '../../database/entities/supplier-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemConfig,
      AuditLog,
      FarmerProfile,
      CooperativeProfile,
      EnterpriseProfile,
      SupplierProfile,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminRoute {}
