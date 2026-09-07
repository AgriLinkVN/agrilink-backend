import {
  StoredFileModel,
  StoredFileRepositoryPort,
} from './ports/outbound/stored-file-repository.port';
import { UserRole } from '@common/enums';
import { StorageService } from './storage.service';

const FILE_ID = '11111111-1111-4111-8111-111111111111';

function makeStoredFile(
  overrides: Partial<StoredFileModel> = {},
): StoredFileModel {
  return {
    id: FILE_ID,
    ownerId: 'owner-1',
    assetType: 'CERTIFICATION',
    provider: 'SUPABASE',
    visibility: 'PRIVATE',
    status: 'QUARANTINED',
    objectKey: 'development/owners/owner-1/CERTIFICATION/file.pdf',
    originalName: 'file.pdf',
    declaredMime: 'application/pdf',
    sizeBytes: 20,
    expiresAt: new Date(),
    resourceType: null,
    resourceId: null,
    ...overrides,
  };
}

function makeRepository(): jest.Mocked<StoredFileRepositoryPort> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForOwner: jest.fn(),
    findExpiredPending: jest.fn(),
    findDeletionRetries: jest.fn(),
    updateStatus: jest.fn(),
    attachToResource: jest.fn(),
    detachFromResource: jest.fn(),
    restoreReviewedStatus: jest.fn(),
    markDeletionRetry: jest.fn(),
  };
}

function makeService(
  repository = makeRepository(),
  fileStorageOverrides: Record<string, jest.Mock> = {},
) {
  const fileStorage = {
    createUploadUrl: jest
      .fn()
      .mockResolvedValue({ signedUrl: 'upload-url', token: 'token' }),
    upload: jest.fn(),
    createDownloadUrl: jest.fn().mockResolvedValue({
      path: 'development/owners/owner-1/CERTIFICATION/file.pdf',
      signedUrl: 'download-url',
      expiresIn: 300,
    }),
    exists: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    ...fileStorageOverrides,
  };
  const service = new StorageService(
    {} as never,
    fileStorage,
    repository,
    {
      environmentPrefix: 'development',
      uploadIntentTtlSeconds: 900,
    } as never,
    { recordAudit: jest.fn(), recordProviderMetric: jest.fn() },
  );
  return { service, fileStorage, repository };
}

describe('StorageService private files', () => {
  it('creates an owner-scoped upload intent with a server-generated key', async () => {
    const { service, repository } = makeService();
    repository.create.mockImplementation(async (file) => file);

    const result = await service.createUploadIntent(
      'owner-1',
      {
        assetType: 'KYC_IDENTITY',
        originalName: 'id-card.pdf',
        declaredMime: 'application/pdf',
        sizeBytes: 20,
      },
      'request-1',
    );

    expect(result.fileId).toBeDefined();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'owner-1',
        visibility: 'PRIVATE',
        status: 'PENDING',
        resourceId: null,
        objectKey: expect.stringMatching(
          /^development\/owners\/owner-1\/KYC_IDENTITY\/.+\.pdf$/,
        ),
      }),
    );
  });

  it('does not issue a URL when the owner-scoped record is absent', async () => {
    const { service, repository, fileStorage } = makeService();
    repository.findByIdForOwner.mockResolvedValue(null);

    await expect(
      service.createFileDownloadUrl(
        'other-owner',
        FILE_ID,
        'request-1',
        'buyer',
      ),
    ).rejects.toThrow('Stored file not found');
    expect(fileStorage.createDownloadUrl).not.toHaveBeenCalled();
  });

  it('allows a reviewer to read a quarantined file without changing ownership', async () => {
    const { service, repository, fileStorage } = makeService();
    repository.findByIdForOwner.mockResolvedValue(null);
    repository.findById.mockResolvedValue(makeStoredFile());

    await expect(
      service.createFileDownloadUrl(
        'reviewer-1',
        FILE_ID,
        'request-1',
        'state_agency',
      ),
    ).resolves.toEqual({ signedUrl: 'download-url', expiresIn: 300 });
    expect(fileStorage.createDownloadUrl).toHaveBeenCalledWith(
      'development/owners/owner-1/CERTIFICATION/file.pdf',
    );
  });

  it('does not allow an owner to download a quarantined file', async () => {
    const { service, repository, fileStorage } = makeService();
    repository.findByIdForOwner.mockResolvedValue(makeStoredFile());

    await expect(
      service.createFileDownloadUrl('owner-1', FILE_ID, 'request-1', 'farmer'),
    ).rejects.toThrow('File is not available');
    expect(fileStorage.createDownloadUrl).not.toHaveBeenCalled();
  });

  it('attaches only a matching private file owned by the caller', async () => {
    const { service, repository } = makeService();
    repository.findByIdForOwner.mockResolvedValue(makeStoredFile());
    repository.attachToResource.mockResolvedValue(true);

    await service.attachOwnedFile({
      fileId: FILE_ID,
      ownerId: 'owner-1',
      assetType: 'CERTIFICATION',
      resourceType: 'PRODUCT',
      resourceId: 'product-1',
    });

    expect(repository.attachToResource).toHaveBeenCalledWith(
      FILE_ID,
      'owner-1',
      'CERTIFICATION',
      'PRODUCT',
      'product-1',
    );
  });

  it('detaches only the expected owner resource link during compensation', async () => {
    const { service, repository } = makeService();
    repository.findByIdForOwner.mockResolvedValue(
      makeStoredFile({
        resourceType: 'PRODUCT',
        resourceId: 'product-1',
      }),
    );
    repository.detachFromResource.mockResolvedValue(true);

    await service.detachOwnedFile({
      fileId: FILE_ID,
      ownerId: 'owner-1',
      resourceType: 'PRODUCT',
      resourceId: 'product-1',
    });

    expect(repository.detachFromResource).toHaveBeenCalledWith(
      FILE_ID,
      'owner-1',
      'PRODUCT',
      'product-1',
    );
  });

  it('reports whether a reviewer transition changed file state', async () => {
    const { service, repository } = makeService();
    repository.findById.mockResolvedValueOnce(makeStoredFile());
    repository.updateStatus.mockResolvedValueOnce(
      makeStoredFile({ status: 'ACTIVE' }),
    );

    await expect(
      service.reviewFile({
        fileId: FILE_ID,
        reviewerRole: UserRole.STATE_AGENCY,
        approve: true,
      }),
    ).resolves.toBe(true);

    repository.findById.mockResolvedValueOnce(
      makeStoredFile({ status: 'ACTIVE' }),
    );
    await expect(
      service.reviewFile({
        fileId: FILE_ID,
        reviewerRole: UserRole.STATE_AGENCY,
        approve: true,
      }),
    ).resolves.toBe(false);
  });

  it('restores a changed review state for saga compensation', async () => {
    const { service, repository } = makeService();
    repository.findById.mockResolvedValue(
      makeStoredFile({ status: 'FAILED' }),
    );
    repository.restoreReviewedStatus.mockResolvedValue(true);

    await service.restoreReviewedFile({
      fileId: FILE_ID,
      reviewerRole: UserRole.ADMIN,
    });

    expect(repository.restoreReviewedStatus).toHaveBeenCalledWith(FILE_ID);
  });

  it('retires a replaced private file through the existing cleanup flow', async () => {
    const { service, repository, fileStorage } = makeService();
    repository.findByIdForOwner.mockResolvedValue(
      makeStoredFile({ status: 'ACTIVE' }),
    );
    repository.updateStatus.mockResolvedValue(
      makeStoredFile({ status: 'DELETED' }),
    );

    await service.retireOwnedFile({
      fileId: FILE_ID,
      ownerId: 'owner-1',
      correlationId: 'request-1',
    });

    expect(fileStorage.delete).toHaveBeenCalledWith(
      'development/owners/owner-1/CERTIFICATION/file.pdf',
    );
    expect(repository.updateStatus).toHaveBeenCalledWith(
      FILE_ID,
      'owner-1',
      'DELETED',
    );
  });

  it('rejects an attachment with the wrong private asset type', async () => {
    const { service, repository } = makeService();
    repository.findByIdForOwner.mockResolvedValue(makeStoredFile());

    await expect(
      service.attachOwnedFile({
        fileId: FILE_ID,
        ownerId: 'owner-1',
        assetType: 'KYC_IDENTITY',
        resourceType: 'FARMER_PROFILE',
        resourceId: 'profile-1',
      }),
    ).rejects.toThrow('asset type');
    expect(repository.attachToResource).not.toHaveBeenCalled();
  });

  it('returns owned private bytes to an internal KYC consumer', async () => {
    const content = Buffer.from('private-content');
    const { service, repository, fileStorage } = makeService(undefined, {
      download: jest.fn().mockResolvedValue(content),
    });
    repository.findByIdForOwner.mockResolvedValue(
      makeStoredFile({ assetType: 'KYC_IDENTITY' }),
    );

    await expect(
      service.readOwnedFile({
        fileId: FILE_ID,
        ownerId: 'owner-1',
        assetType: 'KYC_IDENTITY',
      }),
    ).resolves.toEqual(content);
    expect(fileStorage.download).toHaveBeenCalledWith(
      'development/owners/owner-1/CERTIFICATION/file.pdf',
    );
  });
});
