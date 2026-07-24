import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { StorageService } from './application/storage.service';
import { CloudinaryService } from './infrastructure/cloudinary/cloudinary.service';
import { IMAGE_STORAGE } from './application/ports/outbound/image-storage.port';
import { FILE_STORAGE } from './application/ports/outbound/file-storage.port';
import { StorageController } from './presentation/controllers/storage.controller';
import { SupabaseClientProvider } from './infrastructure/supabase/supabase.client';
import { SupabaseStorageService } from './infrastructure/supabase/supabase-storage.service';
import { StorageThrottlerGuard } from './presentation/guards/storage-throttler.guard';
import { createStorageConfig, STORAGE_CONFIG } from '@config/storage.config';
import { CloudinaryProvider } from './infrastructure/cloudinary/cloudinary.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoredFileEntity } from './infrastructure/persistence/stored-file.entity';
import { TypeOrmStoredFileRepository } from './infrastructure/persistence/typeorm-stored-file.repository';
import { STORED_FILE_REPOSITORY } from './application/ports/outbound/stored-file-repository.port';
import { StorageCleanupService } from './application/storage-cleanup.service';
import { ScheduleModule } from '@nestjs/schedule';
import { STORAGE_OBSERVABILITY } from './application/ports/outbound/storage-observability.port';
import { StorageObservabilityService } from './infrastructure/observability/storage-observability.service';
import { STORED_FILE_ACCESS } from './application/ports/inbound/stored-file-access.port';
import { RetiredStorageRouteTelemetryMiddleware } from './presentation/middleware/retired-storage-route-telemetry.middleware';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([StoredFileEntity]),
  ],
  controllers: [StorageController],
  providers: [
    {
      provide: STORAGE_CONFIG,
      useFactory: () => createStorageConfig(process.env),
    },
    SupabaseClientProvider,
    CloudinaryProvider,
    TypeOrmStoredFileRepository,

    // Services
    CloudinaryService,
    SupabaseStorageService,
    StorageObservabilityService,

    // Bind token → implementation
    {
      provide: IMAGE_STORAGE,
      useExisting: CloudinaryService,
    },
    {
      provide: FILE_STORAGE,
      useExisting: SupabaseStorageService,
    },
    {
      provide: STORED_FILE_REPOSITORY,
      useExisting: TypeOrmStoredFileRepository,
    },
    {
      provide: STORAGE_OBSERVABILITY,
      useExisting: StorageObservabilityService,
    },
    { provide: STORED_FILE_ACCESS, useExisting: StorageService },

    StorageService,
    StorageCleanupService,
    StorageThrottlerGuard,
    RetiredStorageRouteTelemetryMiddleware,
  ],
  exports: [STORED_FILE_ACCESS],
})
export class StorageModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RetiredStorageRouteTelemetryMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
