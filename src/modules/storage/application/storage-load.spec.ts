import { StorageService } from './storage.service';

describe('storage intent load budget', () => {
  it('creates concurrent intents without duplicate IDs or excessive heap growth', async () => {
    const fileStorage = {
      createUploadUrl: jest.fn(async () => ({
        path: 'contract/path',
        signedUrl: 'https://example.test/upload',
        token: 'token',
      })),
      upload: jest.fn(),
      createDownloadUrl: jest.fn(),
      exists: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
    };
    const repository = {
      create: jest.fn(async (file) => file),
      findById: jest.fn(),
      findByIdForOwner: jest.fn(),
      findExpiredPending: jest.fn(),
      findDeletionRetries: jest.fn(),
      markDeletionRetry: jest.fn(),
      updateStatus: jest.fn(),
      attachToResource: jest.fn(),
      detachFromResource: jest.fn(),
      restoreReviewedStatus: jest.fn(),
    };
    const service = new StorageService(
      {} as never,
      fileStorage,
      repository,
      { environmentPrefix: 'contract', uploadIntentTtlSeconds: 900 } as never,
      { recordAudit: jest.fn(), recordProviderMetric: jest.fn() },
    );
    const before = process.memoryUsage().heapUsed;

    const intents = await Promise.all(
      Array.from({ length: 50 }, () =>
        service.createUploadIntent(
          'owner-1',
          {
            assetType: 'KYC_IDENTITY',
            originalName: 'identity.pdf',
            declaredMime: 'application/pdf',
            sizeBytes: 512,
          },
          'load-test',
        ),
      ),
    );
    const heapGrowth = process.memoryUsage().heapUsed - before;

    expect(new Set(intents.map((intent) => intent.fileId)).size).toBe(50);
    expect(heapGrowth).toBeLessThan(32 * 1024 * 1024);
  });
});
