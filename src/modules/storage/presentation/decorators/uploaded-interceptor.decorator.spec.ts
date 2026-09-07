import { createUploadMulterOptions } from './uploaded-interceptor.decorator';

describe('createUploadMulterOptions', () => {
  it('sets limits before Multer buffers an uploaded file', () => {
    const options = createUploadMulterOptions(5 * 1024 * 1024);

    expect(options.limits).toMatchObject({
      fileSize: 5 * 1024 * 1024,
      files: 1,
      fields: 10,
      fieldNameSize: 100,
      fieldSize: 10 * 1024,
      parts: 12,
    });
  });
});
