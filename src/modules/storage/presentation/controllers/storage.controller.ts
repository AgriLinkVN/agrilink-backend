import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Readable } from 'stream';

import { StorageService } from '../../application/storage.service';
import { PresignDto } from '../schemas/presign.dto';
import { UploadFile } from '../decorators/uploaded-interceptor.decorator';
import { UploadedImage } from '../decorators/uploaded-image.decorator';
// import { Public } from '../../../auth/presentation/decorators/public.decorator';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // ─── Presign URL — Supabase document ─────────────────────────
  // @Public()
  @Post('files/presign')
  @ApiOperation({ summary: 'Tạo presigned URL để upload file lên Supabase' })
  presign(@Body() dto: PresignDto) {
    return this.storageService.createFileUploadUrl(dto);
  }

  @Post('test-error')
  testError() {
    throw new Error('This is a test error');
  }

  // ─── Upload ảnh — Cloudinary ──────────────────────────────────
  // @Public()
  @Post('images/upload')
  @ApiOperation({ summary: 'Upload ảnh lên Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', description: 'Loại ảnh: avatar | cccd | document | certification | product', example: 'avatar' }
      },
    },
  })
  @UploadFile('file')
  async uploadImage(
    @UploadedImage() file: Express.Multer.File,
    @Body('type') type?: string,
  ) {
    // Convert Buffer to Readable stream
    const stream = Readable.from(file.buffer);

    let secureUrl = '';

    let targetFolder = 'agrilink/products'; // default

    if (type) {
      if (type.startsWith('avatar')) {
         const role = type.split('_')[1];
         targetFolder = role ? `agrilink/avatars/${role}` : 'agrilink/avatars';
      } else if (type === 'cccd') {
         targetFolder = 'agrilink/documents/cccd';
      } else if (type === 'document' || type === 'business_license') {
         targetFolder = 'agrilink/documents';
      } else if (type === 'certification') {
         targetFolder = 'agrilink/certifications';
      }
    }

    secureUrl = await this.storageService.uploadCustomFolder(stream, file.originalname, targetFolder);

    return { secure_url: secureUrl };
  }
}