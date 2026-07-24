// domain/interfaces/file-storage.service.interface.ts
export const FILE_STORAGE_SERVICE = 'FILE_STORAGE_SERVICE';

export interface UploadUrlResult {  // ← đảm bảo có export này
  path: string;
  token: string;
  signedUrl: string;
}

export interface StoredFileResult {
  path: string;
  fullPath: string;
}

export interface DownloadUrlResult {
  path: string;
  signedUrl: string;
  expiresIn: number;
}

export interface IFileStorageService {
  createUploadUrl(path: string): Promise<UploadUrlResult>;
  upload(path: string, file: Buffer, contentType: string): Promise<StoredFileResult>;
  createDownloadUrl(path: string): Promise<DownloadUrlResult>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
}
