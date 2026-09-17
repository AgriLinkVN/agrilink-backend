import { Provider } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { STORAGE_CONFIG, StorageConfig } from '@config/storage.config';

export const SUPABASE_CLIENT = Symbol('SUPABASE_CLIENT');

export const SupabaseClientProvider: Provider = {
  provide: SUPABASE_CLIENT,
  inject: [STORAGE_CONFIG],
  useFactory: (config: StorageConfig): SupabaseClient => {
    return createClient(config.supabaseUrl, config.supabaseServiceKey);
  },
};
