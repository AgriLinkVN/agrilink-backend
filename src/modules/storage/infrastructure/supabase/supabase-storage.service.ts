import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

import {
  IFileStorageService,
  UploadUrlResult,
} from '../../domain/interfaces/file-storage.service.interface';
import { SUPABASE_CLIENT } from './supabase.client';

@Injectable()
export class SupabaseStorageService implements IFileStorageService {
  private readonly bucket: string;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly configService: ConfigService,
  ) {
    this.bucket =
      this.configService.get<string>('SUPABASE_BUCKET') ?? 'agrilink-documents';
  }

  async createUploadUrl(path: string): Promise<UploadUrlResult> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUploadUrl(path);

    if (error) throw new BadRequestException(`Tạo upload URL thất bại: ${error.message}`);

    return {
      path,
      token: data.token,
      signedUrl: data.signedUrl,
    };
  }

  async createDownloadUrl(path: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, 3600); // hết hạn sau 1 giờ

    if (error) throw new BadRequestException(`Tạo download URL thất bại: ${error.message}`);

    return data.signedUrl;
  }

  async delete(path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([path]);

    if (error) throw new BadRequestException(`Xóa file thất bại: ${error.message}`);
  }
}