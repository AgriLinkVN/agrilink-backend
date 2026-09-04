import { UserRole } from '@common/enums';

export const STORED_FILE_ACCESS = Symbol('STORED_FILE_ACCESS');

export type StorageReviewerRole =
  | UserRole.ADMIN
  | UserRole.STATE_AGENCY;

export interface AttachOwnedStoredFileInput {
  fileId: string;
  ownerId: string;
  assetType: 'CERTIFICATION' | 'KYC_IDENTITY' | 'BUSINESS_LICENSE';
  resourceType: string;
  resourceId: string;
}

export interface DetachOwnedStoredFileInput {
  fileId: string;
  ownerId: string;
  resourceType: string;
  resourceId: string;
}

export interface ReadOwnedStoredFileInput {
  fileId: string;
  ownerId: string;
  assetType: AttachOwnedStoredFileInput['assetType'];
}

export interface ReviewStoredFileInput {
  fileId: string;
  reviewerRole: StorageReviewerRole;
  approve: boolean;
}

export interface RestoreReviewedStoredFileInput {
  fileId: string;
  reviewerRole: StorageReviewerRole;
}

export interface RetireOwnedStoredFileInput {
  fileId: string;
  ownerId: string;
  correlationId: string;
}

export interface StoredFileAccessPort {
  attachOwnedFile(input: AttachOwnedStoredFileInput): Promise<void>;
  detachOwnedFile(input: DetachOwnedStoredFileInput): Promise<void>;
  readOwnedFile(input: ReadOwnedStoredFileInput): Promise<Buffer>;
  reviewFile(input: ReviewStoredFileInput): Promise<boolean>;
  restoreReviewedFile(input: RestoreReviewedStoredFileInput): Promise<void>;
  retireOwnedFile(input: RetireOwnedStoredFileInput): Promise<void>;
}
