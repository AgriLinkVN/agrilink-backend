import { createClient } from '@supabase/supabase-js';
import { createStorageConfig } from '@config/storage.config';
import { StorageConfig } from '@config/storage.config';
import { SupabaseStorageService } from './supabase-storage.service';

const runContract = process.env.STORAGE_CONTRACT_TESTS === 'true';

(runContract ? describe : describe.skip)('Supabase storage contract (non-production only)', () => {
  let config: StorageConfig;
  let path: string;
  let service: SupabaseStorageService;

  beforeAll(() => {
    config = createStorageConfig(process.env);
    if (!/^(contract|test)(-|$)/.test(config.environmentPrefix)) {
      throw new Error('STORAGE_ENV_PREFIX must start with contract or test for provider contract tests');
    }
    path = `${config.environmentPrefix}/contracts/${Date.now()}-${Math.random().toString(16).slice(2)}.txt`;
    service = new SupabaseStorageService(createClient(config.supabaseUrl, config.supabaseServiceKey), config, { recordAudit: jest.fn(), recordProviderMetric: jest.fn() });
  });

  afterAll(async () => {
    await service.delete(path).catch(() => undefined);
  });

  it('uploads, finds, downloads, signs, and deletes an isolated non-production object', async () => {
    await expect(service.upload(path, Buffer.from('storage-contract'), 'text/plain')).resolves.toMatchObject({ path });
    await expect(service.exists(path)).resolves.toBe(true);
    await expect(service.download(path)).resolves.toEqual(Buffer.from('storage-contract'));
    await expect(service.createDownloadUrl(path)).resolves.toMatchObject({ path, expiresIn: config.downloadUrlTtlSeconds });
    await service.delete(path);
    await expect(service.exists(path)).resolves.toBe(false);
  });
});
