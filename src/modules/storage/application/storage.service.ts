import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { STORAGE_CONFIG, StorageConfig } from '@config/storage.config';
import {
  STORED_FILE_REPOSITORY,
  StoredFileModel,
  StoredFileRepositoryPort,
} from './ports/outbound/stored-file-repository.port';
import { Readable } from 'stream';

import {
  DownloadUrlResult,
  FILE_STORAGE,
  FileStoragePort,
  StoredFileResult,
  UploadUrlResult,
} from './ports/outbound/file-storage.port';
import {
  IMAGE_STORAGE,
  ImageStoragePort,
  ImageTransformOptions,
} from './ports/outbound/image-storage.port';
import {
  AVATAR_TRANSFORM,
  STORAGE_IMAGE_TARGETS,
} from './storage-image.policy';
import {
  InvalidStoredFileTransitionError,
  StoredFileNotFoundError,
  UnauthorizedStoredFileReviewError,
  UploadNotCompletedError,
} from './storage-file.errors';
import { validatePrivateContent } from './content-validation.policy';
import { canTransition } from './storage-lifecycle.policy';
import {
  STORAGE_OBSERVABILITY,
  StorageAuditAction,
  StorageObservabilityPort,
} from './ports/outbound/storage-observability.port';
import {
  AttachOwnedStoredFileInput,
  ReadOwnedStoredFileInput,
  ReviewStoredFileInput,
  StoredFileAccessPort,
} from './ports/inbound/stored-file-access.port';

@Injectable()
export class StorageService implements StoredFileAccessPort {
  constructor(
    @Inject(IMAGE_STORAGE)
    private readonly imageStorage: ImageStoragePort,

    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStoragePort,
    @Inject(STORED_FILE_REPOSITORY)
    private readonly storedFiles: StoredFileRepositoryPort,
    @Inject(STORAGE_CONFIG) private readonly config: StorageConfig,
    @Inject(STORAGE_OBSERVABILITY)
    private readonly observability: StorageObservabilityPort,
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
    return this.imageStorage.uploadImageFromStream(
      stream,
      filename,
      target,
      options,
      folderSuffix,
    );
  }

  async deleteImage(imageUrl: string): Promise<void> {
    return this.imageStorage.deleteImage(imageUrl);
  }

  // ─── Private documents (Supabase) ────────────────────────────

  async createUploadIntent(
    ownerId: string,
    input: {
      assetType: string;
      originalName: string;
      declaredMime: string;
      sizeBytes: number;
    },
    correlationId: string,
  ) {
    const id = randomUUID();
    const extension =
      input.originalName.match(/\.([a-zA-Z0-9]{1,10})$/)?.[1]?.toLowerCase() ??
      'bin';
    const objectKey = `${this.config.environmentPrefix}/owners/${ownerId}/${input.assetType}/${id}.${extension}`;
    const expiresAt = new Date(
      Date.now() + this.config.uploadIntentTtlSeconds * 1000,
    );
    const file: StoredFileModel = {
      id,
      ownerId,
      assetType: input.assetType,
      provider: 'SUPABASE',
      visibility: 'PRIVATE',
      status: 'PENDING',
      objectKey,
      originalName: input.originalName,
      declaredMime: input.declaredMime,
      sizeBytes: input.sizeBytes,
      expiresAt,
      resourceType: null,
      resourceId: null,
    };
    await this.storedFiles.create(file);
    const upload = await this.audit(
      'UPLOAD_INTENT',
      id,
      ownerId,
      correlationId,
      () => this.fileStorage.createUploadUrl(objectKey),
    );
    return {
      fileId: id,
      uploadUrl: upload.signedUrl,
      uploadToken: upload.token,
      expiresAt,
    };
  }

  async completeUploadIntent(
    ownerId: string,
    id: string,
    correlationId: string,
  ) {
    return this.audit(
      'UPLOAD_COMPLETION',
      id,
      ownerId,
      correlationId,
      async () => {
        const file = await this.requireOwnedFile(id, ownerId);
        if (file.status !== 'PENDING') return file;
        if (!(await this.fileStorage.exists(file.objectKey)))
          throw new UploadNotCompletedError('Upload has not completed');
        const content = await validatePrivateContent(
          await this.fileStorage.download(file.objectKey),
        );
        return this.storedFiles.updateStatus(
          id,
          ownerId,
          'QUARANTINED',
          content,
        );
      },
    );
  }

  async createFileDownloadUrl(
    callerId: string,
    id: string,
    correlationId: string,
    callerRole?: string,
  ) {
    return this.audit(
      'PRIVATE_DOWNLOAD',
      id,
      callerId,
      correlationId,
      async () => {
        const ownedFile = await this.storedFiles.findByIdForOwner(id, callerId);
        const isReviewer =
          callerRole === 'admin' || callerRole === 'state_agency';
        const file =
          ownedFile ??
          (isReviewer ? await this.storedFiles.findById(id) : null);
        if (!file) throw new StoredFileNotFoundError('Stored file not found');
        const canRead =
          file.status === 'ACTIVE' ||
          (isReviewer && file.status === 'QUARANTINED');
        if (!canRead)
          throw new InvalidStoredFileTransitionError('File is not available');
        const download = await this.fileStorage.createDownloadUrl(
          file.objectKey,
        );
        return {
          signedUrl: download.signedUrl,
          expiresIn: download.expiresIn,
        };
      },
    );
  }

  async deleteStoredFile(ownerId: string, id: string, correlationId: string) {
    const file = await this.requireOwnedFile(id, ownerId);
    if (file.status === 'DELETED') return file;
    try {
      await this.fileStorage.delete(file.objectKey);
    } catch {
      await this.storedFiles.markDeletionRetry(id, ownerId);
      this.observability.recordAudit({
        action: 'DELETE',
        outcome: 'RETRY_SCHEDULED',
        fileId: id,
        ownerId,
        correlationId,
        provider: 'SUPABASE',
      });
      return this.storedFiles.findByIdForOwner(id, ownerId);
    }
    const deleted = await this.storedFiles.updateStatus(id, ownerId, 'DELETED');
    this.observability.recordAudit({
      action: 'DELETE',
      outcome: 'SUCCESS',
      fileId: id,
      ownerId,
      correlationId,
      provider: 'SUPABASE',
    });
    return deleted;
  }

  async reviewStoredFile(id: string, reviewerRole: string, approve: boolean) {
    if (reviewerRole !== 'admin' && reviewerRole !== 'state_agency')
      throw new UnauthorizedStoredFileReviewError('Reviewer role is required');
    const file = await this.storedFiles.findById(id);
    if (!file) throw new StoredFileNotFoundError('Stored file not found');
    if (
      (approve && file.status === 'ACTIVE') ||
      (!approve && file.status === 'FAILED')
    )
      return file;
    if (file.status !== 'QUARANTINED')
      throw new InvalidStoredFileTransitionError(
        'Only quarantined files can be reviewed',
      );
    return this.storedFiles.updateStatus(
      file.id,
      file.ownerId,
      approve ? 'ACTIVE' : 'FAILED',
    );
  }

  async attachOwnedFile(input: AttachOwnedStoredFileInput): Promise<void> {
    const file = await this.requireOwnedFile(input.fileId, input.ownerId);
    if (file.assetType !== input.assetType)
      throw new InvalidStoredFileTransitionError(
        'Stored file asset type does not match resource',
      );
    if (file.provider !== 'SUPABASE' || file.visibility !== 'PRIVATE')
      throw new InvalidStoredFileTransitionError(
        'Stored file is not a private document',
      );
    if (file.status !== 'QUARANTINED' && file.status !== 'ACTIVE')
      throw new InvalidStoredFileTransitionError(
        'Stored file is not ready to attach',
      );
    if (
      file.resourceId &&
      (file.resourceId !== input.resourceId ||
        file.resourceType !== input.resourceType)
    )
      throw new InvalidStoredFileTransitionError(
        'Stored file is already attached',
      );
    const attached = await this.storedFiles.attachToResource(
      file.id,
      input.ownerId,
      input.assetType,
      input.resourceType,
      input.resourceId,
    );
    if (!attached)
      throw new InvalidStoredFileTransitionError(
        'Stored file could not be attached',
      );
  }

  async readOwnedFile(input: ReadOwnedStoredFileInput): Promise<Buffer> {
    const file = await this.requireOwnedFile(input.fileId, input.ownerId);
    if (
      file.assetType !== input.assetType ||
      file.provider !== 'SUPABASE' ||
      file.visibility !== 'PRIVATE'
    ) {
      throw new InvalidStoredFileTransitionError(
        'Stored file does not match the requested private asset',
      );
    }
    if (file.status !== 'QUARANTINED' && file.status !== 'ACTIVE') {
      throw new InvalidStoredFileTransitionError(
        'Stored file is not ready to read',
      );
    }
    return this.fileStorage.download(file.objectKey);
  }

  async reviewFile(input: ReviewStoredFileInput): Promise<void> {
    await this.reviewStoredFile(
      input.fileId,
      input.reviewerRole,
      input.approve,
    );
  }

  private async requireOwnedFile(
    id: string,
    ownerId: string,
  ): Promise<StoredFileModel> {
    const file = await this.storedFiles.findByIdForOwner(id, ownerId);
    if (!file) throw new StoredFileNotFoundError('Stored file not found');
    return file;
  }

  private async audit<T>(
    action: StorageAuditAction,
    fileId: string,
    ownerId: string,
    correlationId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      const result = await operation();
      this.observability.recordAudit({
        action,
        outcome: 'SUCCESS',
        fileId,
        ownerId,
        correlationId,
        provider: 'SUPABASE',
      });
      return result;
    } catch (error) {
      this.observability.recordAudit({
        action,
        outcome: 'FAILURE',
        fileId,
        ownerId,
        correlationId,
        provider: 'SUPABASE',
      });
      throw error;
    }
  }
}
