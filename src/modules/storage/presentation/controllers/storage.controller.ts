import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Readable } from 'stream';

import { StorageService } from '../../application/storage.service';
import { PresignDto } from '../schemas/presign.dto';
import { UploadFile } from '../decorators/uploaded-interceptor.decorator';
import { UploadedImage } from '../decorators/uploaded-image.decorator';
import { UploadedDocument } from '../decorators/uploaded-document.decorator';
import { ImageTransformOptions } from '../../domain/interfaces/image-storage.service.interface';
import { CLOUDINARY_FOLDERS } from '../../infrastructure/cloudinary/cloudinary.config';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('files/presign')
  @ApiOperation({ summary: 'Tạo presigned URL để upload file lên Supabase' })
  presign(@Body() dto: PresignDto) {
    return this.storageService.createFileUploadUrl(dto);
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
          description: 'Loại ảnh: product | ads | reviews | profile | avatar | avatar_farmer',
          example: 'product',
        },
      },
    },
  })
  @UploadFile('file')
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
  @UploadFile('file')
  async uploadFile(
    @UploadedDocument() file: Express.Multer.File,
    @Body('path') path: string,
  ) {
    return this.storageService.uploadDocumentFile(
      path,
      file.buffer,
      file.mimetype,
    );
  }

  @Get('files/download-url')
  @ApiOperation({ summary: 'Tạo signed URL để xem hoặc tải tài liệu Supabase' })
  getDownloadUrl(@Query() dto: PresignDto) {
    return this.storageService.getDocumentDownloadUrl(dto.path);
  }

  private getImageTarget(type?: string): {
    folder: string;
    options?: ImageTransformOptions;
  } {
    const normalizedType = type?.trim().toLowerCase();

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
}
