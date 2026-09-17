import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { StorageConfig, STORAGE_CONFIG } from '@config/storage.config';

import { DownloadUrlResult, FileStoragePort, StoredFileResult, UploadUrlResult } from '../../application/ports/outbound/file-storage.port';
import { SUPABASE_CLIENT } from './supabase.client';
import { STORAGE_OBSERVABILITY, StorageObservabilityPort } from '../../application/ports/outbound/storage-observability.port';
import { ProviderOperationError, ProviderTimeoutError, runWithProviderResilience } from '../observability/provider-resilience';

@Injectable()
export class SupabaseStorageService implements FileStoragePort {
  private readonly bucket: string;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(STORAGE_CONFIG) private readonly config: StorageConfig,
    @Inject(STORAGE_OBSERVABILITY) private readonly observability: StorageObservabilityPort,
  ) {
    this.bucket = this.config.supabaseBucket;
  }

  async createUploadUrl(path: string): Promise<UploadUrlResult> {
    const safePath = this.validatePath(path);
    return this.observe('create_upload_url', undefined, async () => {
      const { data, error } = await this.getClient().storage.from(this.bucket).createSignedUploadUrl(safePath);
      if (error) throw new ProviderOperationError(error.message, error.status);
      return { path: safePath, token: data.token, signedUrl: data.signedUrl };
    });
  }

  async upload(
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<StoredFileResult> {
    const safePath = this.validatePath(path);
    return this.observe('upload', file.byteLength, async () => {
      const { data, error } = await this.getClient().storage.from(this.bucket).upload(safePath, file, { contentType, upsert: false });
      if (error) throw new ProviderOperationError(error.message, error.status);
      return { path: data.path, fullPath: data.fullPath ?? `${this.bucket}/${data.path}` };
    });
  }

  async createDownloadUrl(path: string): Promise<DownloadUrlResult> {
    const safePath = this.validatePath(path);
    const expiresIn = this.config.downloadUrlTtlSeconds;
    return this.observe('create_download_url', undefined, async () => {
      const { data, error } = await this.getClient().storage.from(this.bucket).createSignedUrl(safePath, expiresIn);
      if (error) throw new ProviderOperationError(error.message, error.status);
      return { path: safePath, signedUrl: data.signedUrl, expiresIn };
    });
  }

  async delete(path: string): Promise<void> {
    const safePath = this.validatePath(path);
    await this.observe('delete', undefined, async () => {
      const { error } = await this.getClient().storage.from(this.bucket).remove([safePath]);
      if (error) throw new ProviderOperationError(error.message, error.status);
    });
  }

  async exists(path: string): Promise<boolean> {
    const safePath = this.validatePath(path);
    const slash = safePath.lastIndexOf('/');
    const folder = slash >= 0 ? safePath.slice(0, slash) : '';
    const filename = slash >= 0 ? safePath.slice(slash + 1) : safePath;
    return this.observe('exists', undefined, async () => {
      const { data, error } = await this.getClient().storage.from(this.bucket).list(folder, { search: filename });
      if (error) throw new ProviderOperationError(error.message, error.status);
      return data.some((file) => file.name === filename);
    });
  }

  async download(path: string): Promise<Buffer> {
    const safePath = this.validatePath(path);
    return this.observe('download', undefined, async () => {
      const { data, error } = await this.getClient().storage.from(this.bucket).download(safePath);
      if (error) throw new ProviderOperationError(error.message, error.status);
      return Buffer.from(await data.arrayBuffer());
    }, (content) => content.byteLength);
  }

  private getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new InternalServerErrorException('Supabase storage chưa được cấu hình');
    }

    return this.supabase;
  }

  private validatePath(path: string): string {
    const safePath = path?.trim();

    if (!safePath) {
      throw new BadRequestException('Đường dẫn file không được để trống');
    }

    if (
      safePath.startsWith('/') ||
      safePath.includes('..') ||
      safePath.includes('\\')
    ) {
      throw new BadRequestException('Đường dẫn file không hợp lệ');
    }

    return safePath.replace(/\/+/g, '/');
  }

  private async observe<T>(operation: string, byteCount: number | undefined, request: () => Promise<T>, getResponseBytes?: (result: T) => number): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await runWithProviderResilience(request);
      this.observability.recordProviderMetric({ provider: 'SUPABASE', operation, outcome: 'SUCCESS', latencyMs: Date.now() - startedAt, byteCount: getResponseBytes ? getResponseBytes(result) : byteCount });
      return result;
    } catch (error) {
      this.observability.recordProviderMetric({ provider: 'SUPABASE', operation, outcome: this.metricOutcome(error), latencyMs: Date.now() - startedAt, byteCount });
      throw error instanceof ProviderTimeoutError ? new BadRequestException('Storage provider request timed out') : new BadRequestException('Storage provider request failed');
    }
  }

  private metricOutcome(error: unknown): 'ERROR' | 'REJECTED' | 'TIMEOUT' {
    if (error instanceof ProviderTimeoutError) return 'TIMEOUT';
    if (error instanceof ProviderOperationError && error.status !== undefined && error.status < 500) return 'REJECTED';
    return 'ERROR';
  }
}
