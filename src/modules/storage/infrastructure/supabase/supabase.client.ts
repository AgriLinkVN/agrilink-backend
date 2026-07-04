import { InternalServerErrorException, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = Symbol('SUPABASE_CLIENT');

export const SupabaseClientProvider: Provider = {
  provide: SUPABASE_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): SupabaseClient => {
    const url = configService.get<string>('SUPABASE_URL');
    const key = configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!url || !key) {
      throw new InternalServerErrorException(
        'Supabase configuration is missing: SUPABASE_URL hoặc SUPABASE_SERVICE_KEY',
      );
    }

    return createClient(url, key);
  },
};
