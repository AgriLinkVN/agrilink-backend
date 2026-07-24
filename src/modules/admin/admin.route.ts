import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminReportService } from './admin-report.service';
import { SystemConfig } from './entities/system-config.entity';
import { AuditLog } from './entities/audit-log.entity';
import { FarmerProfile } from '../../database/entities/farmer-profile.entity';
import { CooperativeProfile } from '../../database/entities/cooperative-profile.entity';
import { EnterpriseProfile } from '../../database/entities/enterprise-profile.entity';
import { SupplierProfile } from '../../database/entities/supplier-profile.entity';
import { User } from '../../database/entities/user.entity';
import { Product } from '../products/infrastructure/persistence/entities/product.entity';
import { IncidentReport } from '../../database/entities/incident-report.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    StorageModule,
    TypeOrmModule.forFeature([
      SystemConfig,
      AuditLog,
      FarmerProfile,
      CooperativeProfile,
      EnterpriseProfile,
      SupplierProfile,
      User,
      Product,
      IncidentReport,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminReportService],
  exports: [AdminService],
})
export class AdminRoute {}
