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
        type: { type: 'string', description: 'Loại ảnh: avatar | product', example: 'avatar' },
      },
    },
  })
  @UploadFile('file')
  async uploadImage(
    @UploadedImage() file: Express.Multer.File,
    @Body('type') type?: string,
  ) {
    const stream = Readable.from(file.buffer);
    let targetFolder = 'agrilink/products';

    if (type?.startsWith('avatar')) {
      const role = type.split('_')[1];
      targetFolder = role ? `agrilink/avatars/${role}` : 'agrilink/avatars';
    }

    const secureUrl = await this.storageService.uploadCustomFolder(
      stream,
      file.originalname,
      targetFolder,
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
}
