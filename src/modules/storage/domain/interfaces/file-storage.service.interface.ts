// domain/interfaces/file-storage.service.interface.ts
export const FILE_STORAGE_SERVICE = 'FILE_STORAGE_SERVICE';

export interface UploadUrlResult {  // ← đảm bảo có export này
  path: string;
  token: string;
  signedUrl: string;
}

export interface IFileStorageService {
  createUploadUrl(path: string): Promise<UploadUrlResult>;
  createDownloadUrl(path: string): Promise<string>;
  delete(path: string): Promise<void>;
}