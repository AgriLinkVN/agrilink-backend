import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { UploadApiResponse, v2 } from 'cloudinary';
import { Readable } from 'stream';
import { pipeline } from 'node:stream/promises';
import { CLOUDINARY_CLIENT } from '@config/storage.config';
import { STORAGE_OBSERVABILITY, StorageObservabilityPort } from '../../application/ports/outbound/storage-observability.port';
import { ProviderOperationError, ProviderTimeoutError, runWithProviderResilience, runWithProviderTimeout } from '../observability/provider-resilience';

import { ImageStoragePort, ImageStorageTarget, ImageTransformOptions } from '../../application/ports/outbound/image-storage.port';
import {
  CLOUDINARY_FOLDERS,
  CLOUDINARY_TRANSFORMATIONS,
} from './cloudinary.config';

@Injectable()
export class CloudinaryService implements ImageStoragePort {

  constructor(@Inject(CLOUDINARY_CLIENT) private readonly cloudinary: typeof v2, @Inject(STORAGE_OBSERVABILITY) private readonly observability: StorageObservabilityPort) {}

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

    return this.observe('upload_stream', () => new Promise((resolve, reject) => {
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
            done(() => reject(new ProviderOperationError(error.message, undefined, error.name)));
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
    }));
  }

  async deleteImage(imageUrl: string): Promise<void> {
    const publicId = this.extractPublicId(imageUrl);
    await this.observe('delete', () => this.cloudinary.uploader.destroy(publicId).then(() => undefined));
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

  private async observe<T>(operation: string, request: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = operation === 'upload_stream' ? await runWithProviderTimeout(request) : await runWithProviderResilience(request);
      this.observability.recordProviderMetric({ provider: 'CLOUDINARY', operation, outcome: 'SUCCESS', latencyMs: Date.now() - startedAt });
      return result;
    } catch (error) {
      this.observability.recordProviderMetric({ provider: 'CLOUDINARY', operation, outcome: this.metricOutcome(error), latencyMs: Date.now() - startedAt });
      throw new BadRequestException('Cloudinary storage request failed');
    }
  }

  private metricOutcome(error: unknown): 'ERROR' | 'REJECTED' | 'TIMEOUT' {
    if (error instanceof ProviderTimeoutError) return 'TIMEOUT';
    if (error instanceof ProviderOperationError && error.status !== undefined && error.status < 500) return 'REJECTED';
    return 'ERROR';
  }
}
