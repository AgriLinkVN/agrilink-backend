import { config as loadEnvironment } from 'dotenv';
import { assertPrivateSupabaseBucket, createStorageConfig } from '../config/storage.config';

loadEnvironment();

async function main(): Promise<void> {
  const config = createStorageConfig(process.env);
  await assertPrivateSupabaseBucket(config);
  console.log(`Storage configuration verified: private bucket '${config.supabaseBucket}'`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown storage configuration error';
  console.error(`Storage configuration check failed: ${message}`);
  process.exitCode = 1;
});
