import { Injectable, Inject } from '@nestjs/common';
import { Readable } from 'stream';

import {
  IImageStorageService,
  IMAGE_STORAGE_SERVICE,
  ImageTransformOptions,
} from '../domain/interfaces/image-storage.service.interface';
import {
  IFileStorageService,
  FILE_STORAGE_SERVICE,
  UploadUrlResult,
} from '../domain/interfaces/file-storage.service.interface';
import { CLOUDINARY_FOLDERS } from '../infrastructure/cloudinary/cloudinary.config';
import { PresignDto } from '../presentation/schemas/presign.dto';


@Injectable()
export class StorageService {
  constructor(
    @Inject(IMAGE_STORAGE_SERVICE)
    private readonly imageStorage: IImageStorageService,

    @Inject(FILE_STORAGE_SERVICE)
    private readonly fileStorage: IFileStorageService,
  ) {}

  // ─── Image (Cloudinary) ───────────────────────────────────────

  async uploadImage(stream: Readable, filename: string): Promise<string> {
    return this.imageStorage.uploadImageFromStream(
      stream,
      filename,
      CLOUDINARY_FOLDERS.PRODUCTS,
    );
  }

  async uploadAvatar(stream: Readable, filename: string): Promise<string> {
    const options: ImageTransformOptions = {
      width: 400,
      height: 400,
      crop: 'fill',
      quality: 'auto',
    };
    return this.imageStorage.uploadImageFromStream(
      stream,
      filename,
      CLOUDINARY_FOLDERS.AVATARS,
      options,
    );
  }

  async uploadCertification(stream: Readable, filename: string): Promise<string> {
    return this.imageStorage.uploadImageFromStream(
      stream,
      filename,
      CLOUDINARY_FOLDERS.CERTIFICATIONS,
    );
  }

  async uploadDocument(stream: Readable, filename: string): Promise<string> {
    return this.imageStorage.uploadImageFromStream(
      stream,
      filename,
      CLOUDINARY_FOLDERS.DOCUMENTS,
    );
  }

  async uploadCustomFolder(stream: Readable, filename: string, folder: string): Promise<string> {
    return this.imageStorage.uploadImageFromStream(stream, filename, folder);
  }

  async deleteImage(imageUrl: string): Promise<void> {
    return this.imageStorage.deleteImage(imageUrl);
  }

  // ─── File/Document (Supabase) — chưa dùng ở IT1 ─────────────

  async createFileUploadUrl(dto: PresignDto): Promise<UploadUrlResult> {
    return this.fileStorage.createUploadUrl(dto.path);
  }

  async getDocumentDownloadUrl(path: string): Promise<string> {
    return this.fileStorage.createDownloadUrl(path);
  }

  async deleteDocument(path: string): Promise<void> {
    return this.fileStorage.delete(path);
  }
}