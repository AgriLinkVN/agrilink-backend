import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { UploadApiResponse, v2 } from 'cloudinary';
import { Readable } from 'stream';
import { pipeline } from 'node:stream/promises';
import { CLOUDINARY_CLIENT } from '@config/storage.config';

import { ImageStoragePort, ImageStorageTarget, ImageTransformOptions } from '../../application/ports/outbound/image-storage.port';
import {
  CLOUDINARY_FOLDERS,
  CLOUDINARY_TRANSFORMATIONS,
} from './cloudinary.config';

@Injectable()
export class CloudinaryService implements ImageStoragePort {

  constructor(@Inject(CLOUDINARY_CLIENT) private readonly cloudinary: typeof v2) {}

  async uploadImageFromStream(
    stream: Readable,
    filename: string,
    target: ImageStorageTarget = 'PRODUCTS',
    options?: ImageTransformOptions,
    folderSuffix?: string,
  ): Promise<string> {
    const hasCustomTransform = !!(
      options?.width ||
      options?.height ||
      options?.crop ||
      options?.quality
    );
    const transformation = options?.applyDefaultTransform === false
      ? undefined
      : hasCustomTransform
        ? [
          { width: options.width, height: options.height, crop: options.crop ?? 'limit' },
          { quality: options.quality ?? 'auto' },
          { fetch_format: 'auto' },
        ]
        : CLOUDINARY_TRANSFORMATIONS.PRODUCT_IMAGE;

    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder: folderSuffix ? `${this.resolveFolder(target)}/${folderSuffix}` : this.resolveFolder(target),
          public_id: filename.replace(/\.[^/.]+$/, ''),
          resource_type: options?.resourceType ?? 'auto',
          ...(transformation ? { transformation } : {}),
        },
        (error: Error | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            done(() => reject(new BadRequestException(error.message)));
            return;
          }
          if (!result?.secure_url) {
            done(() => reject(new BadRequestException('Không nhận được URL')));
            return;
          }
          done(() => resolve(result.secure_url));
        },
      );

      void pipeline(stream, uploadStream).catch((err: unknown) =>
        done(() => reject(err instanceof Error ? err : new Error(String(err))))
      );
    });
  }

  async deleteImage(imageUrl: string): Promise<void> {
    const publicId = this.extractPublicId(imageUrl);
    await this.cloudinary.uploader.destroy(publicId);
  }

  private extractPublicId(url: string): string {
    return url
      .split('/')
      .slice(-3)
      .join('/')
      .replace(/\.[^/.]+$/, '');
  }

  private resolveFolder(target: ImageStorageTarget): string {
    return CLOUDINARY_FOLDERS[target];
  }
}
