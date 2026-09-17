import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminReportService } from "./admin-report.service";
import { SystemConfig } from "./entities/system-config.entity";
import { AuditLog } from "./entities/audit-log.entity";
import { IncidentReport } from "../../database/entities/incident-report.entity";
import { ProductsModule } from "../products/products.module";
import { StorageModule } from "../storage/storage.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { ProfilesRoute } from "../profiles/profiles.route";

@Module({
  imports: [
    StorageModule,
    UsersModule,
    AuthModule,
    ProfilesRoute,
    ProductsModule,
    TypeOrmModule.forFeature([SystemConfig, AuditLog, IncidentReport]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminReportService],
  exports: [AdminService],
})
export class AdminRoute {}
