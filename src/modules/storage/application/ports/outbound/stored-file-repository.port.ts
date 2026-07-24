export const STORED_FILE_REPOSITORY = Symbol('STORED_FILE_REPOSITORY');
export interface StoredFileModel {
  id: string;
  ownerId: string;
  assetType: string;
  provider: string;
  visibility: string;
  status: string;
  objectKey: string;
  originalName: string;
  declaredMime: string;
  sizeBytes: number;
  expiresAt: Date;
  resourceType: string | null;
  resourceId: string | null;
  detectedMime?: string | null;
  checksumSha256?: string | null;
  extension?: string | null;
  deletionAttempts?: number;
}
export interface StoredFileRepositoryPort {
  create(file: StoredFileModel): Promise<StoredFileModel>;
  findById(id: string): Promise<StoredFileModel | null>;
  findByIdForOwner(
    id: string,
    ownerId: string,
  ): Promise<StoredFileModel | null>;
  findExpiredPending(now: Date): Promise<StoredFileModel[]>;
  findDeletionRetries(): Promise<StoredFileModel[]>;
  updateStatus(
    id: string,
    ownerId: string,
    status: string,
    metadata?: Pick<
      StoredFileModel,
      'detectedMime' | 'checksumSha256' | 'extension'
    >,
  ): Promise<StoredFileModel | null>;
  attachToResource(
    id: string,
    ownerId: string,
    assetType: string,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean>;
  detachFromResource(
    id: string,
    ownerId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean>;
  restoreReviewedStatus(id: string): Promise<boolean>;
  markDeletionRetry(id: string, ownerId: string): Promise<void>;
}
