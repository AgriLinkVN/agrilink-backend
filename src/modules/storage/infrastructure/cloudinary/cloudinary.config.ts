import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

// Định nghĩa các folder chuẩn — dùng chung toàn dự án
// Dùng constant — refactor 1 chỗ là xong toàn bộ
export const CLOUDINARY_FOLDERS = {
  PRODUCTS: 'agrilink/products',
  CERTIFICATIONS: 'agrilink/certifications',
  AVATARS: 'agrilink/avatars',
  DOCUMENTS: 'agrilink/documents',   // CCCD, giấy phép HTX/DN
} as const;

// Định nghĩa transform mặc định cho từng loại
export const CLOUDINARY_TRANSFORMATIONS = {
  PRODUCT_IMAGE: [
    { width: 1200, height: 1200, crop: 'limit' },
    { quality: 'auto' },
    { fetch_format: 'auto' },
  ],
  AVATAR: [
    { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    { quality: 'auto' },
  ],
  THUMBNAIL: [
    { width: 300, height: 300, crop: 'fill' },
    { quality: 'auto' },
  ],
} as const;

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: (configService: ConfigService) => {
    return cloudinary.config({
      cloud_name: configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get('CLOUDINARY_API_KEY'),
      api_secret: configService.get('CLOUDINARY_API_SECRET'),
    });
  },
  inject: [ConfigService],
};