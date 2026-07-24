import { StorageService } from './storage.service';

describe('StorageService document paths', () => {
  it('passes owner-scoped paths to the private storage provider', async () => {
    const fileStorage = {
      createUploadUrl: jest.fn().mockResolvedValue({ signedUrl: 'upload-url', path: 'users/user-1/docs/a.pdf' }),
      upload: jest.fn(),
      createDownloadUrl: jest.fn(),
      delete: jest.fn(),
    };
    const service = new StorageService({} as never, fileStorage);

    await service.createFileUploadUrl('user-1', 'docs/a.pdf');

    expect(fileStorage.createUploadUrl).toHaveBeenCalledWith('users/user-1/docs/a.pdf');
  });
});
