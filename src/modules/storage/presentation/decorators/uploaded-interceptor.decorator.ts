import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

// Nhận file từ request, đưa vào buffer - Mọi controller có upload file đều dùng chung decorator này, có thể tùy chỉnh fieldName, maxCount, maxSizeMB, fileType


const multerOptions = { storage: memoryStorage() };

export const UploadFile = (fieldName: string = 'file') =>
  applyDecorators(
    UseInterceptors(FileInterceptor(fieldName, multerOptions)),
  );

export const UploadFiles = (fieldName: string = 'files', maxCount: number = 10) =>
  applyDecorators(
    UseInterceptors(FilesInterceptor(fieldName, maxCount, multerOptions)),
  );