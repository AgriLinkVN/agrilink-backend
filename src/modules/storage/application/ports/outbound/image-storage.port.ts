import { Readable } from 'stream';
export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');
export type ImageStorageTarget = 'PRODUCTS' | 'ADS' | 'REVIEWS' | 'PROFILES' | 'AVATARS';
export interface ImageTransformOptions { width?: number; height?: number; crop?: string; quality?: string; resourceType?: 'image' | 'video' | 'raw' | 'auto'; applyDefaultTransform?: boolean; }
export interface ImageStoragePort { uploadImageFromStream(stream: Readable, filename: string, target: ImageStorageTarget, options?: ImageTransformOptions, folderSuffix?: string): Promise<string>; deleteImage(imageUrl: string): Promise<void>; }
