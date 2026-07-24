import { StorageService } from './storage.service';

describe('StorageService document paths', () => {
  it('passes owner-scoped paths to the private storage provider', async () => {
    const fileStorage = {
      createUploadUrl: jest.fn().mockResolvedValue({ signedUrl: 'upload-url', path: 'users/user-1/docs/a.pdf' }),
      upload: jest.fn(),
      createDownloadUrl: jest.fn(),
      exists: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
    };
    const service = new StorageService({} as never, fileStorage, {} as never, {} as never);

    await service.createFileUploadUrl('user-1', 'docs/a.pdf');

    expect(fileStorage.createUploadUrl).toHaveBeenCalledWith('users/user-1/docs/a.pdf');
  });

  it('creates an owner-scoped private upload intent with a server-generated key', async () => {
    const fileStorage = { createUploadUrl: jest.fn().mockResolvedValue({ signedUrl: 'upload-url', token: 'token' }), upload: jest.fn(), createDownloadUrl: jest.fn(), exists: jest.fn(), download: jest.fn(), delete: jest.fn() };
    const repository = { create: jest.fn().mockImplementation(async (file) => file), findById: jest.fn(), findByIdForOwner: jest.fn(), updateStatus: jest.fn() };
    const service = new StorageService({} as never, fileStorage, repository, { environmentPrefix: 'development', uploadIntentTtlSeconds: 900 } as never);

    const result = await service.createUploadIntent('owner-1', { assetType: 'KYC_IDENTITY', originalName: 'id-card.pdf', declaredMime: 'application/pdf', sizeBytes: 20 });

    expect(result.fileId).toBeDefined();
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'owner-1', visibility: 'PRIVATE', status: 'PENDING', objectKey: expect.stringMatching(/^development\/owners\/owner-1\/KYC_IDENTITY\/.+\.pdf$/) }));
  });

  it('does not issue a download URL when the owner-scoped record is absent', async () => {
    const fileStorage = { createUploadUrl: jest.fn(), upload: jest.fn(), createDownloadUrl: jest.fn(), exists: jest.fn(), download: jest.fn(), delete: jest.fn() };
    const repository = { create: jest.fn(), findById: jest.fn(), findByIdForOwner: jest.fn().mockResolvedValue(null), updateStatus: jest.fn() };
    const service = new StorageService({} as never, fileStorage, repository, {} as never);

    await expect(service.createFileDownloadUrl('other-owner', 'file-1')).rejects.toThrow('Stored file not found');
    expect(fileStorage.createDownloadUrl).not.toHaveBeenCalled();
  });
});
