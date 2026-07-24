import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { StorageService } from './application/storage.service';
import { CloudinaryService } from './infrastructure/cloudinary/cloudinary.service';
import { IMAGE_STORAGE_SERVICE } from './domain/interfaces/image-storage.service.interface';
import { FILE_STORAGE_SERVICE } from './domain/interfaces/file-storage.service.interface';
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

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([StoredFileEntity])],
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

    // Bind token → implementation
    {
      provide: IMAGE_STORAGE_SERVICE,
      useExisting: CloudinaryService,
    },
    {
      provide: FILE_STORAGE_SERVICE,
      useExisting: SupabaseStorageService,
    },
    { provide: STORED_FILE_REPOSITORY, useExisting: TypeOrmStoredFileRepository },

    StorageService,
    StorageThrottlerGuard,
  ],
  exports: [StorageService],
})
export class StorageModule {}
