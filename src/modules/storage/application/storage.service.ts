import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { STORAGE_CONFIG, StorageConfig } from '@config/storage.config';
import { STORED_FILE_REPOSITORY, StoredFileModel, StoredFileRepositoryPort } from './ports/outbound/stored-file-repository.port';
import { Readable } from 'stream';

import { DownloadUrlResult, FILE_STORAGE, FileStoragePort, StoredFileResult, UploadUrlResult } from './ports/outbound/file-storage.port';
import { IMAGE_STORAGE, ImageStoragePort, ImageTransformOptions } from './ports/outbound/image-storage.port';
import { AVATAR_TRANSFORM, STORAGE_IMAGE_TARGETS } from './storage-image.policy';
import { buildOwnedStoragePath } from './storage-upload.policy';
import { InvalidStoredFileTransitionError, StoredFileNotFoundError, UnauthorizedStoredFileReviewError, UploadNotCompletedError } from './storage-file.errors';
import { validatePrivateContent } from './content-validation.policy';
import { canTransition } from './storage-lifecycle.policy';

@Injectable()
export class StorageService {
  constructor(
    @Inject(IMAGE_STORAGE)
    private readonly imageStorage: ImageStoragePort,

    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStoragePort,
    @Inject(STORED_FILE_REPOSITORY)
    private readonly storedFiles: StoredFileRepositoryPort,
    @Inject(STORAGE_CONFIG) private readonly config: StorageConfig,
  ) {}

  // ─── Image (Cloudinary) ───────────────────────────────────────

  async uploadImage(stream: Readable, filename: string): Promise<string> {
    return this.imageStorage.uploadImageFromStream(
      stream,
      filename,
      STORAGE_IMAGE_TARGETS.PRODUCTS,
    );
  }

  async uploadAvatar(stream: Readable, filename: string): Promise<string> {
    const options: ImageTransformOptions = AVATAR_TRANSFORM;
    return this.imageStorage.uploadImageFromStream(
      stream,
      filename,
      STORAGE_IMAGE_TARGETS.AVATARS,
      options,
    );
  }

  async uploadCustomFolder(
    stream: Readable,
    filename: string,
    target: import('./ports/outbound/image-storage.port').ImageStorageTarget,
    options?: ImageTransformOptions,
    folderSuffix?: string,
  ): Promise<string> {
    return this.imageStorage.uploadImageFromStream(stream, filename, target, options, folderSuffix);
  }

  async deleteImage(imageUrl: string): Promise<void> {
    return this.imageStorage.deleteImage(imageUrl);
  }

  // ─── File/Document (Supabase) ────────────────────────────────

  async createFileUploadUrl(ownerId: string, path: string): Promise<UploadUrlResult> {
    return this.fileStorage.createUploadUrl(buildOwnedStoragePath(ownerId, path));
  }

  async uploadDocumentFile(
    ownerId: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<StoredFileResult> {
    return this.fileStorage.upload(buildOwnedStoragePath(ownerId, path), file, contentType);
  }

  async getDocumentDownloadUrl(ownerId: string, path: string): Promise<DownloadUrlResult> {
    return this.fileStorage.createDownloadUrl(buildOwnedStoragePath(ownerId, path));
  }

  async deleteDocument(ownerId: string, path: string): Promise<void> {
    return this.fileStorage.delete(buildOwnedStoragePath(ownerId, path));
  }

  async createUploadIntent(ownerId: string, input: { assetType: string; originalName: string; declaredMime: string; sizeBytes: number; resourceType?: string; resourceId?: string; }) {
    const id = randomUUID();
    const extension = input.originalName.match(/\.([a-zA-Z0-9]{1,10})$/)?.[1]?.toLowerCase() ?? 'bin';
    const objectKey = `${this.config.environmentPrefix}/owners/${ownerId}/${input.assetType}/${id}.${extension}`;
    const expiresAt = new Date(Date.now() + this.config.uploadIntentTtlSeconds * 1000);
    const file: StoredFileModel = { id, ownerId, assetType: input.assetType, provider: 'SUPABASE', visibility: 'PRIVATE', status: 'PENDING', objectKey, originalName: input.originalName, declaredMime: input.declaredMime, sizeBytes: input.sizeBytes, expiresAt, resourceType: input.resourceType ?? null, resourceId: input.resourceId ?? null };
    await this.storedFiles.create(file);
    const upload = await this.fileStorage.createUploadUrl(objectKey);
    return { fileId: id, uploadUrl: upload.signedUrl, uploadToken: upload.token, expiresAt };
  }

  async completeUploadIntent(ownerId: string, id: string) {
    const file = await this.requireOwnedFile(id, ownerId);
    if (file.status !== 'PENDING') return file;
    if (!(await this.fileStorage.exists(file.objectKey))) throw new UploadNotCompletedError('Upload has not completed');
    const content = await validatePrivateContent(await this.fileStorage.download(file.objectKey));
    return this.storedFiles.updateStatus(id, ownerId, 'QUARANTINED', content);
  }

  async createFileDownloadUrl(ownerId: string, id: string) {
    const file = await this.requireOwnedFile(id, ownerId);
    if (file.status !== 'ACTIVE') throw new Error('File is not available');
    return this.fileStorage.createDownloadUrl(file.objectKey);
  }

  async deleteStoredFile(ownerId: string, id: string) {
    const file = await this.requireOwnedFile(id, ownerId);
    if (file.status === 'DELETED') return file;
    try { await this.fileStorage.delete(file.objectKey); }
    catch { await this.storedFiles.markDeletionRetry(id, ownerId); return this.storedFiles.findByIdForOwner(id, ownerId); }
    return this.storedFiles.updateStatus(id, ownerId, 'DELETED');
  }

  async reviewStoredFile(id: string, reviewerRole: string, approve: boolean) {
    if (reviewerRole !== 'admin' && reviewerRole !== 'state_agency') throw new UnauthorizedStoredFileReviewError('Reviewer role is required');
    const file = await this.storedFiles.findById(id);
    if (!file) throw new StoredFileNotFoundError('Stored file not found');
    if (file.status !== 'QUARANTINED') throw new InvalidStoredFileTransitionError('Only quarantined files can be reviewed');
    return this.storedFiles.updateStatus(file.id, file.ownerId, approve ? 'ACTIVE' : 'FAILED');
  }

  private async requireOwnedFile(id: string, ownerId: string): Promise<StoredFileModel> {
    const file = await this.storedFiles.findByIdForOwner(id, ownerId);
    if (!file) throw new StoredFileNotFoundError('Stored file not found');
    return file;
  }
}
