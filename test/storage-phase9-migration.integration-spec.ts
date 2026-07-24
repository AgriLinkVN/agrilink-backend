import { DataSource, QueryRunner } from 'typeorm';
import { AddStoredFileIdToPrivateDocuments1783818000000 } from '../src/database/migrations/1783818000000-AddStoredFileIdToPrivateDocuments';

const runMigrationTests = process.env.STORAGE_MIGRATION_TESTS === 'true';
const describeMigration = runMigrationTests ? describe : describe.skip;

describeMigration('Storage Phase 9 PostgreSQL migration', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  const schema = `phase9_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
      database: process.env.DB_NAME ?? 'agrilink_test',
      schema,
      synchronize: false,
      logging: false,
    });
    await dataSource.initialize();
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`CREATE SCHEMA "${schema}"`);
    await queryRunner.query(`SET search_path TO "${schema}", public`);
    await createLegacySchema(queryRunner);
    await seedLegacyDocuments(queryRunner);
  }, 30_000);

  afterAll(async () => {
    if (queryRunner) {
      await queryRunner.query('SET search_path TO public');
      await queryRunner.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await queryRunner.release();
    }
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('runs up idempotently and down without deleting stored metadata', async () => {
    const migration =
      new AddStoredFileIdToPrivateDocuments1783818000000();

    await migration.up(queryRunner);

    const firstCount = await storedFileCount(queryRunner);
    expect(firstCount).toBe(11);
    await expectLinkedPrivateMetadata(queryRunner);
    await expectUnsupportedLegacyRowsUnlinked(queryRunner);
    await expectForeignKeysCreated(queryRunner);

    await migration.up(queryRunner);
    expect(await storedFileCount(queryRunner)).toBe(firstCount);
    await expectForeignKeysCreated(queryRunner);

    await migration.down(queryRunner);
    expect(await storedFileCount(queryRunner)).toBe(firstCount);
    await expectTargetColumnsRemoved(queryRunner);
  }, 30_000);
});

async function createLegacySchema(queryRunner: QueryRunner): Promise<void> {
  const statements = [
    `CREATE TABLE "stored_files" (
      "id" uuid PRIMARY KEY,
      "owner_id" uuid NOT NULL,
      "assetType" varchar NOT NULL,
      "provider" varchar NOT NULL,
      "visibility" varchar NOT NULL,
      "status" varchar NOT NULL,
      "object_key" varchar NOT NULL UNIQUE,
      "original_name" varchar NOT NULL,
      "extension" varchar,
      "declared_mime" varchar NOT NULL,
      "size_bytes" bigint NOT NULL,
      "expires_at" timestamptz NOT NULL,
      "resource_type" varchar,
      "resource_id" varchar,
      "created_at" timestamptz NOT NULL,
      "updated_at" timestamptz NOT NULL,
      "deletion_attempts" integer NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE "products" (
      "id" varchar PRIMARY KEY,
      "seller_id" uuid NOT NULL
    )`,
    `CREATE TABLE "product_certifications" (
      "id" uuid PRIMARY KEY,
      "product_id" varchar NOT NULL,
      "document_url" text,
      "status" varchar NOT NULL
    )`,
    `CREATE TABLE "quality_certificates" (
      "id" uuid PRIMARY KEY,
      "issued_to" uuid NOT NULL,
      "document_url" text,
      "status" varchar NOT NULL,
      "revoked_reason" text
    )`,
    `CREATE TABLE "farmer_profiles" (
      "id" uuid PRIMARY KEY,
      "user_id" uuid NOT NULL,
      "cccd_front_url" text,
      "cccd_back_url" text,
      "is_kyc_verified" boolean NOT NULL DEFAULT false,
      "rejection_reason" text
    )`,
    `CREATE TABLE "cooperative_profiles" (
      "id" uuid PRIMARY KEY,
      "user_id" uuid NOT NULL,
      "cooperative_cert_url" text,
      "business_license_url" text,
      "representative_cccd_front_url" text,
      "representative_cccd_back_url" text,
      "members_list_url" text,
      "is_verified" boolean NOT NULL DEFAULT false,
      "rejection_reason" text
    )`,
    `CREATE TABLE "enterprise_profiles" (
      "id" uuid PRIMARY KEY,
      "user_id" uuid NOT NULL,
      "business_license_url" text,
      "is_verified" boolean NOT NULL DEFAULT false,
      "rejection_reason" text
    )`,
    `CREATE TABLE "supplier_profiles" (
      "id" uuid PRIMARY KEY,
      "user_id" uuid NOT NULL,
      "business_license_url" text,
      "is_verified" boolean NOT NULL DEFAULT false,
      "rejection_reason" text
    )`,
  ];
  for (const statement of statements) await queryRunner.query(statement);
}

async function seedLegacyDocuments(queryRunner: QueryRunner): Promise<void> {
  const ownerId = '11111111-1111-4111-8111-111111111111';
  await queryRunner.query(
    `INSERT INTO "products" ("id", "seller_id")
      VALUES ($1, $2), ($3, $2), ($4, $2), ($5, $2)`,
    ['product-1', ownerId, 'product-external', 'product-null', 'product-blank'],
  );
  await queryRunner.query(
    `INSERT INTO "product_certifications"
      ("id", "product_id", "document_url", "status")
      VALUES ($1, $2, $3, 'verified')`,
    ['22222222-2222-4222-8222-222222222222', 'product-1', 'cert/product.pdf'],
  );
  await queryRunner.query(
    `INSERT INTO "product_certifications"
      ("id", "product_id", "document_url", "status")
      VALUES
        ($1, 'product-external', 'https://res.cloudinary.com/demo/private.pdf', 'pending'),
        ($2, 'product-null', NULL, 'pending'),
        ($3, 'product-blank', '   ', 'pending'),
        ($4, 'missing-product', 'orphan/cert.pdf', 'pending')`,
    [
      '82222222-2222-4222-8222-222222222222',
      '92222222-2222-4222-8222-222222222222',
      'a2222222-2222-4222-8222-222222222222',
      'b2222222-2222-4222-8222-222222222222',
    ],
  );
  await queryRunner.query(
    `INSERT INTO "quality_certificates"
      ("id", "issued_to", "document_url", "status", "revoked_reason")
      VALUES ($1, $2, $3, 'active', NULL)`,
    ['33333333-3333-4333-8333-333333333333', ownerId, 'quality/cert.pdf'],
  );
  await queryRunner.query(
    `INSERT INTO "farmer_profiles"
      ("id", "user_id", "cccd_front_url", "cccd_back_url")
      VALUES ($1, $2, $3, $4)`,
    [
      '44444444-4444-4444-8444-444444444444',
      ownerId,
      'farmer/front.jpg',
      'farmer/back.png',
    ],
  );
  await queryRunner.query(
    `INSERT INTO "cooperative_profiles" (
      "id", "user_id", "cooperative_cert_url", "business_license_url",
      "representative_cccd_front_url", "representative_cccd_back_url",
      "members_list_url"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      '55555555-5555-4555-8555-555555555555',
      ownerId,
      'cooperative/cert.pdf',
      'cooperative/license.pdf',
      'cooperative/representative-front.jpg',
      'cooperative/representative-back.jpg',
      'cooperative/members.pdf',
    ],
  );
  await queryRunner.query(
    `INSERT INTO "enterprise_profiles"
      ("id", "user_id", "business_license_url")
      VALUES ($1, $2, $3)`,
    [
      '66666666-6666-4666-8666-666666666666',
      ownerId,
      'enterprise/license.pdf',
    ],
  );
  await queryRunner.query(
    `INSERT INTO "supplier_profiles"
      ("id", "user_id", "business_license_url")
      VALUES ($1, $2, $3)`,
    [
      '77777777-7777-4777-8777-777777777777',
      ownerId,
      'supplier/license.pdf',
    ],
  );
}

async function storedFileCount(queryRunner: QueryRunner): Promise<number> {
  const [result] = (await queryRunner.query(
    'SELECT count(*)::int AS count FROM "stored_files"',
  )) as Array<{ count: number }>;
  return Number(result.count);
}

async function expectLinkedPrivateMetadata(
  queryRunner: QueryRunner,
): Promise<void> {
  const [result] = (await queryRunner.query(`
    SELECT
      count(*) FILTER (
        WHERE "provider" = 'SUPABASE' AND "visibility" = 'PRIVATE'
      )::int AS private_count,
      count(*) FILTER (
        WHERE "owner_id" IS NULL OR "resource_type" IS NULL OR "resource_id" IS NULL
      )::int AS invalid_count
    FROM "stored_files"
  `)) as Array<{ private_count: number; invalid_count: number }>;
  expect(Number(result.private_count)).toBe(11);
  expect(Number(result.invalid_count)).toBe(0);

  const links = (await queryRunner.query(`
    SELECT
      (
        SELECT "stored_file_id"
        FROM "product_certifications"
        WHERE "id" = '22222222-2222-4222-8222-222222222222'
      ) AS product,
      (SELECT "stored_file_id" FROM "quality_certificates" LIMIT 1) AS quality,
      (SELECT "cccd_front_file_id" FROM "farmer_profiles" LIMIT 1) AS farmer
  `)) as Array<{ product: string; quality: string; farmer: string }>;
  expect(links[0]).toEqual({
    product: expect.any(String),
    quality: expect.any(String),
    farmer: expect.any(String),
  });
}

async function expectTargetColumnsRemoved(
  queryRunner: QueryRunner,
): Promise<void> {
  const [result] = (await queryRunner.query(`
    SELECT count(*)::int AS count
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND column_name IN (
        'stored_file_id',
        'cccd_front_file_id',
        'cccd_back_file_id',
        'cooperative_cert_file_id',
        'business_license_file_id',
        'representative_cccd_front_file_id',
        'representative_cccd_back_file_id',
        'members_list_file_id'
      )
  `)) as Array<{ count: number }>;
  expect(Number(result.count)).toBe(0);
}

async function expectUnsupportedLegacyRowsUnlinked(
  queryRunner: QueryRunner,
): Promise<void> {
  const [result] = (await queryRunner.query(`
    SELECT count(*)::int AS count
    FROM "product_certifications"
    WHERE "id" IN (
      '82222222-2222-4222-8222-222222222222',
      '92222222-2222-4222-8222-222222222222',
      'a2222222-2222-4222-8222-222222222222',
      'b2222222-2222-4222-8222-222222222222'
    )
      AND "stored_file_id" IS NULL
  `)) as Array<{ count: number }>;
  expect(Number(result.count)).toBe(4);
}

async function expectForeignKeysCreated(
  queryRunner: QueryRunner,
): Promise<void> {
  const [result] = (await queryRunner.query(`
    SELECT count(*)::int AS count
    FROM pg_constraint constraint_record
    INNER JOIN pg_class constrained_table
      ON constrained_table.oid = constraint_record.conrelid
    INNER JOIN pg_namespace table_namespace
      ON table_namespace.oid = constrained_table.relnamespace
    WHERE constraint_record.contype = 'f'
      AND table_namespace.nspname = current_schema()
      AND constraint_record.confrelid = 'stored_files'::regclass
  `)) as Array<{ count: number }>;
  expect(Number(result.count)).toBe(11);
}
