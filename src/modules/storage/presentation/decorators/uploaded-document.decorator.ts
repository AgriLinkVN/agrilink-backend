import {
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFile,
} from '@nestjs/common';

// Validate document — size + typeProfile CCCD, giấy phép HTX/DN


export const UploadedDocument = (
  maxSizeMB = 10,
  fileType = '.(pdf|png|jpeg|jpg)',
) =>
  UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: maxSizeMB * 1024 * 1024 }),
        new FileTypeValidator({ fileType }),
      ],
    }),
  );