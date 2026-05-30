import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'path';

/**
 * Standalone DataSource for TypeORM CLI (migration:run, migration:generate, migration:revert).
 * Reads .env directly via dotenv — no NestJS DI.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME ?? 'agrilink_db',
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? '',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
  extra: {
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  },
});
