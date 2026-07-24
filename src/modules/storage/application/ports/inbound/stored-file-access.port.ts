export const STORED_FILE_ACCESS = Symbol('STORED_FILE_ACCESS');

export interface AttachOwnedStoredFileInput {
  fileId: string;
  ownerId: string;
  assetType: 'CERTIFICATION' | 'KYC_IDENTITY' | 'BUSINESS_LICENSE';
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
  reviewerRole: string;
  approve: boolean;
}

export interface StoredFileAccessPort {
  attachOwnedFile(input: AttachOwnedStoredFileInput): Promise<void>;
  readOwnedFile(input: ReadOwnedStoredFileInput): Promise<Buffer>;
  reviewFile(input: ReviewStoredFileInput): Promise<void>;
}
