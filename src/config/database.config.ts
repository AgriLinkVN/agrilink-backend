import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * TypeORM configuration factory.
 * Reads all connection parameters from environment variables via ConfigService.
 * Entities are auto-loaded from the modules directory.
 */
export const databaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  database: configService.get<string>('DB_NAME', 'agrilink_db'),
  username: configService.get<string>('DB_USER', 'postgres'),
  password: configService.get<string>('DB_PASS', ''),
  // Auto-load all *.entity.ts files under src/
  autoLoadEntities: true,
  // Sync schema in dev only — NEVER enable in production
  synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
  logging: configService.get<boolean>('DB_LOGGING', false),
  // Connection pool
  extra: {
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});
