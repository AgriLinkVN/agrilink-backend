import { ImageStorageTarget, ImageTransformOptions } from './ports/outbound/image-storage.port';
export const STORAGE_IMAGE_TARGETS = { PRODUCTS: 'PRODUCTS', ADS: 'ADS', REVIEWS: 'REVIEWS', PROFILES: 'PROFILES', AVATARS: 'AVATARS' } as const satisfies Record<string, ImageStorageTarget>;
export const AVATAR_TRANSFORM: ImageTransformOptions = { width: 400, height: 400, crop: 'fill', quality: 'auto' };
