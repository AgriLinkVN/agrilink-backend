import {
  Body,
  BadRequestException,
  NotFoundException,
  Controller,
  Get,
  Delete,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Readable } from 'stream';

import { StorageService } from '../../application/storage.service';
import { UploadFile } from '../decorators/uploaded-interceptor.decorator';
import { UploadedImage } from '../decorators/uploaded-image.decorator';
import {
  ImageStorageTarget,
  ImageTransformOptions,
} from '../../application/ports/outbound/image-storage.port';
import {
  AVATAR_TRANSFORM,
  STORAGE_IMAGE_TARGETS,
} from '../../application/storage-image.policy';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  assertPublicImageType,
  PrivateDocumentImageTypeError,
} from '../../application/storage-upload.policy';
import { StorageThrottlerGuard } from '../guards/storage-throttler.guard';
import { CreateUploadIntentDto } from '../schemas/create-upload-intent.dto';
import {
  StoredFileNotFoundError,
  UploadNotCompletedError,
} from '../../application/storage-file.errors';
import {
  InvalidStoredFileTransitionError,
  UnauthorizedStoredFileReviewError,
} from '../../application/storage-file.errors';
import { ReviewStoredFileDto } from '../schemas/review-stored-file.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { randomUUID } from 'crypto';

@ApiTags('Storage')
@UseGuards(StorageThrottlerGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('uploads/intents')
  @Throttle({ storage: { limit: 10, ttl: 60_000 } })
  createIntent(
    @CurrentUser('sub') ownerId: string,
    @Body() dto: CreateUploadIntentDto,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.storageService.createUploadIntent(
      ownerId,
      dto,
      this.getCorrelationId(correlationId),
    );
  }

  @Post('uploads/:id/complete')
  completeIntent(
    @CurrentUser('sub') ownerId: string,
    @Param('id') id: string,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.withStoredFileErrors(() =>
      this.storageService.completeUploadIntent(
        ownerId,
        id,
        this.getCorrelationId(correlationId),
      ),
    );
  }

  @Get('files/:id/download-url')
  @Throttle({ storage: { limit: 30, ttl: 60_000 } })
  downloadById(
    @CurrentUser('sub') callerId: string,
    @CurrentUser('role') callerRole: string,
    @Param('id') id: string,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.withStoredFileErrors(() =>
      this.storageService.createFileDownloadUrl(
        callerId,
        id,
        this.getCorrelationId(correlationId),
        callerRole,
      ),
    );
  }

  @Delete('files/:id')
  deleteById(
    @CurrentUser('sub') ownerId: string,
    @Param('id') id: string,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    return this.withStoredFileErrors(() =>
      this.storageService.deleteStoredFile(
        ownerId,
        id,
        this.getCorrelationId(correlationId),
      ),
    );
  }

  @Post('files/:id/review')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  reviewFile(
    @Param('id') id: string,
    @CurrentUser('role') role: string,
    @Body() dto: ReviewStoredFileDto,
  ) {
    return this.withStoredFileErrors(() =>
      this.storageService.reviewStoredFile(id, role, dto.approve),
    );
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
    const { folder, options, folderSuffix } = this.getImageTarget(type);

    const secureUrl = await this.storageService.uploadCustomFolder(
      stream,
      file.originalname,
      folder,
      options,
      folderSuffix,
    );

    return { secure_url: secureUrl };
  }

  private getImageTarget(type?: string): {
    folder: ImageStorageTarget;
    options?: ImageTransformOptions;
    folderSuffix?: string;
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
          ? STORAGE_IMAGE_TARGETS.AVATARS
          : STORAGE_IMAGE_TARGETS.AVATARS,
        options: AVATAR_TRANSFORM,
        folderSuffix: role,
      };
    }

    switch (normalizedType) {
      case 'ads':
      case 'ad':
        return { folder: STORAGE_IMAGE_TARGETS.ADS };
      case 'reviews':
      case 'review':
        return { folder: STORAGE_IMAGE_TARGETS.REVIEWS };
      case 'profile':
      case 'profiles':
        return { folder: STORAGE_IMAGE_TARGETS.PROFILES };
      case 'product':
      case 'products':
      default:
        return { folder: STORAGE_IMAGE_TARGETS.PRODUCTS };
    }
  }

  private async withStoredFileErrors<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof StoredFileNotFoundError)
        throw new NotFoundException(error.message);
      if (error instanceof UploadNotCompletedError)
        throw new BadRequestException(error.message);
      if (error instanceof InvalidStoredFileTransitionError)
        throw new BadRequestException(error.message);
      if (error instanceof UnauthorizedStoredFileReviewError)
        throw new BadRequestException(error.message);
      throw error;
    }
  }

  private getCorrelationId(value?: string): string {
    return value && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
      ? value
      : randomUUID();
  }
}
