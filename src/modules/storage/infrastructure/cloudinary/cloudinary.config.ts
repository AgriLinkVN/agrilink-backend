import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_CLIENT, STORAGE_CONFIG, StorageConfig } from '@config/storage.config';

// Định nghĩa các folder chuẩn — dùng chung toàn dự án
// Dùng constant — refactor 1 chỗ là xong toàn bộ
export const CLOUDINARY_FOLDERS = {
  PRODUCTS: 'agrilink/products',
  ADS: 'agrilink/ads',
  REVIEWS: 'agrilink/reviews',
  PROFILES: 'agrilink/profiles',
  AVATARS: 'agrilink/avatars',
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
  provide: CLOUDINARY_CLIENT,
  useFactory: (config: StorageConfig) => {
    return cloudinary.config({
      cloud_name: config.cloudinaryCloudName,
      api_key: config.cloudinaryApiKey,
      api_secret: config.cloudinaryApiSecret,
      secure: true,
    });
  },
  inject: [STORAGE_CONFIG],
};
