export const FILE_STORAGE = Symbol('FILE_STORAGE');
export interface UploadUrlResult { path: string; token: string; signedUrl: string; }
export interface StoredFileResult { path: string; fullPath: string; }
export interface DownloadUrlResult { path: string; signedUrl: string; expiresIn: number; }
export interface FileStoragePort { createUploadUrl(path: string): Promise<UploadUrlResult>; upload(path: string, file: Buffer, contentType: string): Promise<StoredFileResult>; createDownloadUrl(path: string): Promise<DownloadUrlResult>; exists(path: string): Promise<boolean>; download(path: string): Promise<Buffer>; delete(path: string): Promise<void>; }
