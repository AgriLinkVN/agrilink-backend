import { createClient } from '@supabase/supabase-js';

export const STORAGE_CONFIG = Symbol('STORAGE_CONFIG');
export const CLOUDINARY_CLIENT = Symbol('CLOUDINARY_CLIENT');

export interface StorageConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  supabaseBucket: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  environmentPrefix: string;
  maxImageBytes: number;
  maxDocumentBytes: number;
  maxFilesPerRequest: number;
  maxOriginalFilenameLength: number;
  downloadUrlTtlSeconds: number;
  uploadIntentTtlSeconds: number;
  uploadIntentRateLimitPerMinute: number;
  multipartRateLimitPerMinute: number;
  downloadUrlRateLimitPerMinute: number;
}

type Environment = Record<string, string | undefined>;

const required = (env: Environment, name: string): string => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Storage configuration is missing: ${name}`);
  return value;
};

const positiveInteger = (env: Environment, name: string, max: number): number => {
  const value = required(env, name);
  if (!/^\d+$/.test(value)) throw new Error(`Storage configuration must be an integer: ${name}`);
  const parsed = Number(value);
  if (parsed < 1 || parsed > max) throw new Error(`Storage configuration is out of range: ${name}`);
  return parsed;
};

const validateSupabaseServiceKey = (key: string): void => {
  if (key.startsWith('sb_publishable_') || key.includes('anon')) {
    throw new Error('SUPABASE_SERVICE_KEY must be a server administration secret');
  }
  if (key.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')) as { role?: string };
      if (payload.role !== 'service_role') throw new Error('SUPABASE_SERVICE_KEY must be a server administration secret');
    } catch (error) {
      if (error instanceof Error && error.message.includes('server administration')) throw error;
      throw new Error('SUPABASE_SERVICE_KEY is malformed');
    }
  }
};

export function createStorageConfig(env: Environment): StorageConfig {
  const supabaseUrl = required(env, 'SUPABASE_URL');
  try {
    if (new URL(supabaseUrl).protocol !== 'https:') throw new Error();
  } catch {
    throw new Error('SUPABASE_URL must be a valid HTTPS URL');
  }
  const supabaseServiceKey = required(env, 'SUPABASE_SERVICE_KEY');
  validateSupabaseServiceKey(supabaseServiceKey);
  const supabaseBucket = required(env, 'SUPABASE_BUCKET');
  if (!/^[a-z0-9][a-z0-9._-]{2,62}$/.test(supabaseBucket)) throw new Error('SUPABASE_BUCKET is malformed');
  const environmentPrefix = required(env, 'STORAGE_ENV_PREFIX');
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(environmentPrefix)) throw new Error('STORAGE_ENV_PREFIX is malformed');

  return {
    supabaseUrl, supabaseServiceKey, supabaseBucket,
    cloudinaryCloudName: required(env, 'CLOUDINARY_CLOUD_NAME'),
    cloudinaryApiKey: required(env, 'CLOUDINARY_API_KEY'),
    cloudinaryApiSecret: required(env, 'CLOUDINARY_API_SECRET'),
    environmentPrefix,
    maxImageBytes: positiveInteger(env, 'STORAGE_MAX_IMAGE_BYTES', 100 * 1024 * 1024),
    maxDocumentBytes: positiveInteger(env, 'STORAGE_MAX_DOCUMENT_BYTES', 100 * 1024 * 1024),
    maxFilesPerRequest: positiveInteger(env, 'STORAGE_MAX_FILES_PER_REQUEST', 100),
    maxOriginalFilenameLength: positiveInteger(env, 'STORAGE_MAX_ORIGINAL_FILENAME_LENGTH', 1_024),
    downloadUrlTtlSeconds: positiveInteger(env, 'STORAGE_DOWNLOAD_URL_TTL_SECONDS', 3_600),
    uploadIntentTtlSeconds: positiveInteger(env, 'STORAGE_UPLOAD_INTENT_TTL_SECONDS', 3_600),
    uploadIntentRateLimitPerMinute: positiveInteger(env, 'STORAGE_UPLOAD_INTENT_RATE_LIMIT_PER_MINUTE', 10_000),
    multipartRateLimitPerMinute: positiveInteger(env, 'STORAGE_MULTIPART_RATE_LIMIT_PER_MINUTE', 10_000),
    downloadUrlRateLimitPerMinute: positiveInteger(env, 'STORAGE_DOWNLOAD_URL_RATE_LIMIT_PER_MINUTE', 10_000),
  };
}

export function validateStorageEnvironment(env: Record<string, unknown>): Record<string, unknown> {
  createStorageConfig(env as Environment);
  return env;
}

export async function assertPrivateSupabaseBucket(config: StorageConfig): Promise<void> {
  const client = createClient(config.supabaseUrl, config.supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.storage.listBuckets();
  if (error) throw new Error(`Unable to inspect Supabase bucket: ${error.message}`);
  const bucket = data.find((item) => item.name === config.supabaseBucket);
  if (!bucket) throw new Error(`Supabase bucket does not exist: ${config.supabaseBucket}`);
  if (bucket.public) throw new Error(`Supabase bucket must be private: ${config.supabaseBucket}`);
}
