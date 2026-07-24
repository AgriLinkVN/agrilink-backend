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

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    // Supabase client
    SupabaseClientProvider,
 
    // Services
    CloudinaryService,
    SupabaseStorageService,

    // Bind token → implementation
    {
      provide: IMAGE_STORAGE_SERVICE,
      useClass: CloudinaryService,       // ảnh → Cloudinary
    },
    {
      provide: FILE_STORAGE_SERVICE,
      useClass: SupabaseStorageService,  // document → Supabase
    },

    StorageService,
    StorageThrottlerGuard,
  ],
  exports: [StorageService],
})
export class StorageModule {}
