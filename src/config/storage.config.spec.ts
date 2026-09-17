import { createStorageConfig } from './storage.config';

const validEnvironment = () => ({
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_KEY: 'sb_secret_example',
  SUPABASE_BUCKET: 'agrilink-documents',
  CLOUDINARY_CLOUD_NAME: 'agrilink',
  CLOUDINARY_API_KEY: '123456',
  CLOUDINARY_API_SECRET: 'secret',
  STORAGE_ENV_PREFIX: 'development',
  STORAGE_MAX_IMAGE_BYTES: '5242880',
  STORAGE_MAX_DOCUMENT_BYTES: '10485760',
  STORAGE_MAX_FILES_PER_REQUEST: '5',
  STORAGE_MAX_ORIGINAL_FILENAME_LENGTH: '255',
  STORAGE_DOWNLOAD_URL_TTL_SECONDS: '900',
  STORAGE_UPLOAD_INTENT_TTL_SECONDS: '900',
  STORAGE_UPLOAD_INTENT_RATE_LIMIT_PER_MINUTE: '10',
  STORAGE_MULTIPART_RATE_LIMIT_PER_MINUTE: '5',
  STORAGE_DOWNLOAD_URL_RATE_LIMIT_PER_MINUTE: '30',
});

describe('createStorageConfig', () => {
  it('rejects a missing required configuration variable without exposing secrets', () => {
    const env = validEnvironment();
    delete env.CLOUDINARY_API_SECRET;

    expect(() => createStorageConfig(env)).toThrow('Storage configuration is missing: CLOUDINARY_API_SECRET');
  });

  it('rejects malformed URLs, numeric values, and publishable Supabase credentials', () => {
    expect(() => createStorageConfig({ ...validEnvironment(), SUPABASE_URL: 'not-a-url' })).toThrow('SUPABASE_URL must be a valid HTTPS URL');
    expect(() => createStorageConfig({ ...validEnvironment(), STORAGE_MAX_IMAGE_BYTES: 'five' })).toThrow('Storage configuration must be an integer: STORAGE_MAX_IMAGE_BYTES');
    expect(() => createStorageConfig({ ...validEnvironment(), SUPABASE_SERVICE_KEY: 'sb_publishable_example' })).toThrow('SUPABASE_SERVICE_KEY must be a server administration secret');
  });

  it('returns a typed configuration object for valid server credentials', () => {
    expect(createStorageConfig(validEnvironment())).toMatchObject({
      supabaseBucket: 'agrilink-documents',
      environmentPrefix: 'development',
      maxImageBytes: 5_242_880,
      downloadUrlTtlSeconds: 900,
    });
  });
});
