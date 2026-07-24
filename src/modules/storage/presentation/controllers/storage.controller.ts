import {
  Body,
  BadRequestException,
  NotFoundException,
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Readable } from 'stream';

import { StorageService } from '../../application/storage.service';
import { PresignDto } from '../schemas/presign.dto';
import { UploadFile } from '../decorators/uploaded-interceptor.decorator';
import { UploadedImage } from '../decorators/uploaded-image.decorator';
import { UploadedDocument } from '../decorators/uploaded-document.decorator';
import { ImageTransformOptions } from '../../domain/interfaces/image-storage.service.interface';
import { CLOUDINARY_FOLDERS } from '../../infrastructure/cloudinary/cloudinary.config';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  assertPublicImageType,
  InvalidStoragePathError,
  PrivateDocumentImageTypeError,
} from '../../application/storage-upload.policy';
import { StorageThrottlerGuard } from '../guards/storage-throttler.guard';
import { CreateUploadIntentDto } from '../schemas/create-upload-intent.dto';
import { StoredFileNotFoundError, UploadNotCompletedError } from '../../application/storage-file.errors';
import { InvalidStoredFileTransitionError, UnauthorizedStoredFileReviewError } from '../../application/storage-file.errors';
import { ReviewStoredFileDto } from '../schemas/review-stored-file.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';

@ApiTags('Storage')
@UseGuards(StorageThrottlerGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('files/presign')
  @Throttle({ storage: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Tạo presigned URL để upload file lên Supabase' })
  presign(@CurrentUser('sub') ownerId: string, @Body() dto: PresignDto) {
    return this.withPathValidation(() => this.storageService.createFileUploadUrl(ownerId, dto.path));
  }

  @Post('uploads/intents')
  @Throttle({ storage: { limit: 10, ttl: 60_000 } })
  createIntent(@CurrentUser('sub') ownerId: string, @Body() dto: CreateUploadIntentDto) {
    return this.storageService.createUploadIntent(ownerId, dto);
  }

  @Post('uploads/:id/complete')
  completeIntent(@CurrentUser('sub') ownerId: string, @Param('id') id: string) {
    return this.withStoredFileErrors(() => this.storageService.completeUploadIntent(ownerId, id));
  }

  @Get('files/:id/download-url')
  @Throttle({ storage: { limit: 30, ttl: 60_000 } })
  downloadById(@CurrentUser('sub') ownerId: string, @Param('id') id: string) {
    return this.withStoredFileErrors(() => this.storageService.createFileDownloadUrl(ownerId, id));
  }

  @Delete('files/:id')
  deleteById(@CurrentUser('sub') ownerId: string, @Param('id') id: string) {
    return this.withStoredFileErrors(() => this.storageService.deleteStoredFile(ownerId, id));
  }

  @Post('files/:id/review')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  reviewFile(@Param('id') id: string, @CurrentUser('role') role: string, @Body() dto: ReviewStoredFileDto) {
    return this.withStoredFileErrors(() => this.storageService.reviewStoredFile(id, role, dto.approve));
  }

  // ─── Upload ảnh — Cloudinary ──────────────────────────────────
  @Post('images/upload')
  @ApiOperation({ summary: 'Upload ảnh lên Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: {
          type: 'string',
          description:
            'Loại ảnh: product | ads | reviews | profile | avatar | avatar_farmer',
          example: 'product',
        },
      },
    },
  })
  @Throttle({ storage: { limit: 5, ttl: 60_000 } })
  @UploadFile('file', 5 * 1024 * 1024)
  async uploadImage(
    @UploadedImage() file: Express.Multer.File,
    @Body('type') type?: string,
  ) {
    const stream = Readable.from(file.buffer);
    const { folder, options } = this.getImageTarget(type);

    const secureUrl = await this.storageService.uploadCustomFolder(
      stream,
      file.originalname,
      folder,
      options,
    );

    return { secure_url: secureUrl };
  }

  // ─── Upload tài liệu — Supabase ───────────────────────────────
  @Post('files/upload')
  @Throttle({ storage: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Upload tài liệu trực tiếp lên Supabase Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        path: {
          type: 'string',
          description: 'Đường dẫn lưu trong bucket Supabase',
          example: 'certifications/vietgap-001.pdf',
        },
      },
      required: ['file', 'path'],
    },
  })
  @UploadFile('file', 10 * 1024 * 1024)
  async uploadFile(
    @CurrentUser('sub') ownerId: string,
    @UploadedDocument() file: Express.Multer.File,
    @Body('path') path: string,
  ) {
    return this.withPathValidation(() =>
      this.storageService.uploadDocumentFile(ownerId, path, file.buffer, file.mimetype),
    );
  }

  @Get('files/download-url')
  @Throttle({ storage: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Tạo signed URL để xem hoặc tải tài liệu Supabase' })
  getDownloadUrl(@CurrentUser('sub') ownerId: string, @Query() dto: PresignDto) {
    return this.withPathValidation(() => this.storageService.getDocumentDownloadUrl(ownerId, dto.path));
  }

  private getImageTarget(type?: string): {
    folder: string;
    options?: ImageTransformOptions;
  } {
    let normalizedType: string | undefined;
    try {
      normalizedType = assertPublicImageType(type);
    } catch (error) {
      if (error instanceof PrivateDocumentImageTypeError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    if (normalizedType?.startsWith('avatar')) {
      const role = normalizedType.split('_')[1]?.replace(/[^a-z0-9-]/g, '');
      return {
        folder: role
          ? `${CLOUDINARY_FOLDERS.AVATARS}/${role}`
          : CLOUDINARY_FOLDERS.AVATARS,
        options: {
          width: 400,
          height: 400,
          crop: 'fill',
          quality: 'auto',
        },
      };
    }

    switch (normalizedType) {
      case 'ads':
      case 'ad':
        return { folder: CLOUDINARY_FOLDERS.ADS };
      case 'reviews':
      case 'review':
        return { folder: CLOUDINARY_FOLDERS.REVIEWS };
      case 'profile':
      case 'profiles':
        return { folder: CLOUDINARY_FOLDERS.PROFILES };
      case 'product':
      case 'products':
      default:
        return { folder: CLOUDINARY_FOLDERS.PRODUCTS };
    }
  }

  private withPathValidation<T>(operation: () => T): T {
    try {
      return operation();
    } catch (error) {
      if (error instanceof InvalidStoragePathError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async withStoredFileErrors<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); } catch (error) {
      if (error instanceof StoredFileNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof UploadNotCompletedError) throw new BadRequestException(error.message);
      if (error instanceof InvalidStoredFileTransitionError) throw new BadRequestException(error.message);
      if (error instanceof UnauthorizedStoredFileReviewError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}
