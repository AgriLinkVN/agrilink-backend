import {
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';

// Validate ảnh — size + typeProduct, Avatar, Certification


export const UploadedImage = (
  maxSizeMB = 5,
  fileType = '.(png|jpeg|jpg|webp)',
) =>
  UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: maxSizeMB * 1024 * 1024 }),
        new FileTypeValidator({ fileType }),
      ],
    }),
  );

export const UploadedImages = (
  maxSizeMB = 5,
  fileType = '.(png|jpeg|jpg|webp)',
) =>
  UploadedFiles(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: maxSizeMB * 1024 * 1024 }),
        new FileTypeValidator({ fileType }),
      ],
    }),
  );