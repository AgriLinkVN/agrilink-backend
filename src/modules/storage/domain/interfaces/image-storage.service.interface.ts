import { Readable } from 'stream';

export const IMAGE_STORAGE_SERVICE = 'IMAGE_STORAGE_SERVICE';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  crop?: 'limit' | 'fill' | 'crop' | 'scale';
  quality?: 'auto' | number;
  folder?: string;
  resourceType?: 'image' | 'raw' | 'auto';
  applyDefaultTransform?: boolean;
}

export interface IImageStorageService {
  uploadImageFromStream(
    stream: Readable,
    filename: string,
    folder?: string,
    options?: ImageTransformOptions,
  ): Promise<string>;

  deleteImage(imageUrl: string): Promise<void>;
}
