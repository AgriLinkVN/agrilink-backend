import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage, Options } from 'multer';

// Nhận file từ request, đưa vào buffer - Mọi controller có upload file đều dùng chung decorator này, có thể tùy chỉnh fieldName, maxCount, maxSizeMB, fileType


export const createUploadMulterOptions = (maxSizeBytes: number): Options => ({
  storage: memoryStorage(),
  limits: {
    fileSize: maxSizeBytes,
    files: 1,
    fields: 10,
    fieldNameSize: 100,
    fieldSize: 10 * 1024,
    parts: 12,
  },
});

export const UploadFile = (fieldName = 'file', maxSizeBytes = 5 * 1024 * 1024) =>
  applyDecorators(
    UseInterceptors(FileInterceptor(fieldName, createUploadMulterOptions(maxSizeBytes))),
  );

export const UploadFiles = (fieldName = 'files', maxCount = 10, maxSizeBytes = 5 * 1024 * 1024) =>
  applyDecorators(UseInterceptors(FilesInterceptor(fieldName, maxCount, {
    ...createUploadMulterOptions(maxSizeBytes),
    limits: { ...createUploadMulterOptions(maxSizeBytes).limits, files: maxCount },
  })));
