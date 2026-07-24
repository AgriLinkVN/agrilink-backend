import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { StorageConfig, STORAGE_CONFIG } from '@config/storage.config';

import {
  DownloadUrlResult,
  IFileStorageService,
  StoredFileResult,
  UploadUrlResult,
} from '../../domain/interfaces/file-storage.service.interface';
import { SUPABASE_CLIENT } from './supabase.client';

@Injectable()
export class SupabaseStorageService implements IFileStorageService {
  private readonly bucket: string;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(STORAGE_CONFIG) private readonly config: StorageConfig,
  ) {
    this.bucket = this.config.supabaseBucket;
  }

  async createUploadUrl(path: string): Promise<UploadUrlResult> {
    const safePath = this.validatePath(path);
    const { data, error } = await this.getClient().storage
      .from(this.bucket)
      .createSignedUploadUrl(safePath);

    if (error) throw new BadRequestException(`Tạo upload URL thất bại: ${error.message}`);

    return {
      path: safePath,
      token: data.token,
      signedUrl: data.signedUrl,
    };
  }

  async upload(
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<StoredFileResult> {
    const safePath = this.validatePath(path);
    const { data, error } = await this.getClient().storage
      .from(this.bucket)
      .upload(safePath, file, {
        contentType,
        upsert: false,
      });

    if (error) throw new BadRequestException(`Upload file thất bại: ${error.message}`);

    return {
      path: data.path,
      fullPath: data.fullPath ?? `${this.bucket}/${data.path}`,
    };
  }

  async createDownloadUrl(path: string): Promise<DownloadUrlResult> {
    const safePath = this.validatePath(path);
    const expiresIn = this.config.downloadUrlTtlSeconds;
    const { data, error } = await this.getClient().storage
      .from(this.bucket)
      .createSignedUrl(safePath, expiresIn);

    if (error) throw new BadRequestException(`Tạo download URL thất bại: ${error.message}`);

    return {
      path: safePath,
      signedUrl: data.signedUrl,
      expiresIn,
    };
  }

  async delete(path: string): Promise<void> {
    const safePath = this.validatePath(path);
    const { error } = await this.getClient().storage
      .from(this.bucket)
      .remove([safePath]);

    if (error) throw new BadRequestException(`Xóa file thất bại: ${error.message}`);
  }

  async exists(path: string): Promise<boolean> {
    const safePath = this.validatePath(path);
    const slash = safePath.lastIndexOf('/');
    const folder = slash >= 0 ? safePath.slice(0, slash) : '';
    const filename = slash >= 0 ? safePath.slice(slash + 1) : safePath;
    const { data, error } = await this.getClient().storage.from(this.bucket).list(folder, { search: filename });
    if (error) throw new BadRequestException(`Kiểm tra file thất bại: ${error.message}`);
    return data.some((file) => file.name === filename);
  }

  async download(path: string): Promise<Buffer> {
    const { data, error } = await this.getClient().storage.from(this.bucket).download(this.validatePath(path));
    if (error) throw new BadRequestException(`Tải file thất bại: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
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
}
