import { DataSource, QueryRunner } from 'typeorm';
import { EstablishCooperativePersistenceBoundaries1783731600000 } from '../database/migrations/1783731600000-EstablishCooperativePersistenceBoundaries';
import {
  assertSafePersistenceTestEnvironment,
  PersistenceTestOperation,
  PersistenceTestPurpose,
} from '../database/reconciliation/database-target.guard';
import { SeedClassification } from '../database/seeds/framework/seed-contract';

const verificationDatabase = 'agrilink_p3_phase1_verify';

function createDataSource(): DataSource {
  const target = assertSafePersistenceTestEnvironment({
    environment: process.env,
    classification: SeedClassification.TEST,
    purpose: PersistenceTestPurpose.MIGRATION_TEST_HARNESS,
    operation: PersistenceTestOperation.MIGRATION_VERIFICATION,
    acknowledgement: process.env.PERSISTENCE_TEST_TARGET_ACK,
  });
  if (target.database !== verificationDatabase) {
    throw new Error(
      `Refusing to run P3 migration verification outside ${verificationDatabase}.`,
    );
  }

  return new DataSource({
    type: 'postgres',
    host: target.host,
    port: Number(process.env.DB_PORT ?? 55432),
    username: process.env.DB_USER ?? 'p3verify',
    password: process.env.DB_PASS ?? '',
    database: verificationDatabase,
    logging: false,
  });
}

async function createPrerequisites(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await queryRunner.query('CREATE TABLE "users" ("id" uuid PRIMARY KEY)');
  await queryRunner.query('CREATE TABLE "products" ("id" uuid PRIMARY KEY)');
  await queryRunner.query('CREATE TABLE "provinces" ("id" uuid PRIMARY KEY)');
}

async function verifyCleanSchema(queryRunner: QueryRunner): Promise<void> {
  const migration = new EstablishCooperativePersistenceBoundaries1783731600000();
  await migration.up(queryRunner);

  const created = (await queryRunner.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'cooperative_members',
        'bulk_listings',
        'bulk_listing_contributions',
        'harvest_schedules',
        'cooperative_province_references'
      )
    ORDER BY table_name
  `)) as { table_name: string }[];
  if (created.length !== 5) {
    throw new Error(`Expected five P3 tables, received ${created.length}.`);
  }

  await migration.down(queryRunner);
  const remaining = (await queryRunner.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'cooperative_%'
  `)) as { table_name: string }[];
  if (remaining.length !== 0) {
    throw new Error('P3 migration rollback left tables created by the migration.');
  }
}

async function verifyLegacyRejection(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    CREATE TABLE "cooperative_members" (
      "id" uuid PRIMARY KEY,
      "cooperative_id" varchar NOT NULL,
      "farmer_id" varchar NOT NULL,
      "status" varchar(20) NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  const migration = new EstablishCooperativePersistenceBoundaries1783731600000();
  await expectLegacyPreflightFailure(migration, queryRunner);
}

async function verifyLegacyRollback(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    CREATE TABLE "cooperative_members" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "cooperative_id" uuid NOT NULL,
      "farmer_id" uuid NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "role" text,
      "joined_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  const migration = new EstablishCooperativePersistenceBoundaries1783731600000();
  await migration.up(queryRunner);
  await migration.down(queryRunner);

  const remainingTable = (await queryRunner.query(
    "SELECT to_regclass('public.cooperative_members') AS relation",
  )) as { relation: string | null }[];
  const remainingIndex = (await queryRunner.query(
    "SELECT to_regclass('public.idx_p3_member_cooperative_status') AS relation",
  )) as { relation: string | null }[];
  if (!remainingTable[0]?.relation || remainingIndex[0]?.relation) {
    throw new Error('Legacy P3 table or its Phase 1 index was not rolled back safely.');
  }
}

async function expectLegacyPreflightFailure(
  migration: EstablishCooperativePersistenceBoundaries1783731600000,
  queryRunner: QueryRunner,
): Promise<void> {
  try {
    await migration.up(queryRunner);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      !message.includes('P3_PRECHECK_FAILED') ||
      !message.includes('non_uuid_identifier_column')
    ) {
      throw error;
    }
    return;
  }

  throw new Error('Legacy varchar identifiers were accepted unexpectedly.');
}

async function main(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();
    await createPrerequisites(queryRunner);
    await verifyCleanSchema(queryRunner);
    await queryRunner.commitTransaction();

    await queryRunner.startTransaction();
    await verifyLegacyRollback(queryRunner);
    await queryRunner.rollbackTransaction();

    await queryRunner.startTransaction();
    await verifyLegacyRejection(queryRunner);
    await queryRunner.rollbackTransaction();
    console.log('P3 Phase 1 migration verification passed.');
  } finally {
    if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
    await queryRunner.release();
    await dataSource.destroy();
  }
}

void main();
