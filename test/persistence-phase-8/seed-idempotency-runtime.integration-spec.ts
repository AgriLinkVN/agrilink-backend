import "reflect-metadata";
import { randomBytes } from "crypto";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";

import { createDataSourceOptions } from "../../src/database/data-source-options";
import {
  CLI_ENTITY_REGISTRY,
  excludeDeferredEntitiesFromSchemaBuild,
} from "../../src/database/entity-registry";
import { V2_MIGRATIONS } from "../../src/database/migration-registry";
import {
  assertDisposableDatabaseTarget,
  assertSafePersistenceTestEnvironment,
  PersistenceTestOperation,
  PersistenceTestPurpose,
} from "../../src/database/reconciliation/database-target.guard";
import {
  createAdminDataSource,
  createDisposableDatabase,
  DisposableDatabaseTestTarget,
  dropDisposableDatabase,
} from "../../src/database/reconciliation/disposable-database";
import {
  assertCanonicalParity,
  verifyCanonicalParity,
} from "../../src/database/reconciliation/parity-verifier";
import {
  SeedClassification,
  SeedGroup,
  SeedOutputBinding,
} from "../../src/database/seeds/framework/seed-contract";
import { SeedOutputRegistry } from "../../src/database/seeds/framework/seed-dependency-outputs";
import { assertSeedExecutionSafety } from "../../src/database/seeds/framework/seed-environment.guard";
import { buildSeedExecutionPlan } from "../../src/database/seeds/framework/seed-metadata";
import { createPhaseEightTestSeedGroups } from "../../src/database/seeds/test-seed-groups.registry";
import { createAdsPackageReferenceSeedGroup } from "../../src/modules/ads/infrastructure/persistence/seeds/ad-package-reference.seed";
import { CooperativeMemberDevelopmentSeedService } from "../../src/modules/cooperatives/infrastructure/database/seeds/cooperative-member-development-seed.service";
import { TypeOrmCooperativeMemberDevSeedWriter } from "../../src/modules/cooperatives/infrastructure/database/seeds/typeorm-cooperative-member-dev-seed.writer";
import { CooperativeMemberEntity } from "../../src/modules/cooperatives/infrastructure/persistence/entities/cooperative-member.entity";
import { createGeographyProvinceReferenceSeedGroup } from "../../src/modules/geography/infrastructure/seeds/province-reference.seed";
import { createProductsCategoryReferenceSeedGroup } from "../../src/modules/products/infrastructure/database/seeds/product-category.seed";
import { ProductDevelopmentSeedService } from "../../src/modules/products/infrastructure/database/seeds/product-development-seed.service";
import { TypeOrmProductDevSeedWriter } from "../../src/modules/products/infrastructure/database/seeds/typeorm-product-dev-seed.writer";
import { ProductCertification } from "../../src/modules/products/infrastructure/persistence/entities/product-certification.entity";
import { ProductImage } from "../../src/modules/products/infrastructure/persistence/entities/product-image.entity";
import { Product } from "../../src/modules/products/infrastructure/persistence/entities/product.entity";
import { createProfilesRoleProfilesDevSeedGroup } from "../../src/modules/profiles/infrastructure/database/seeds/typeorm-profile-role-development-seed.writer";
import { ReviewDevelopmentSeedService } from "../../src/modules/reviews/infrastructure/database/seeds/review-development-seed.service";
import { TypeOrmReviewDevSeedWriter } from "../../src/modules/reviews/infrastructure/database/seeds/typeorm-review-dev-seed.writer";
import { Review } from "../../src/modules/reviews/infrastructure/persistence/entities/review.entity";
import {
  createUsersDevSeedGroup,
  userDevSeedData,
} from "../../src/modules/users/infrastructure/database/seeds/user.seed";
import { userTestIdentitySeedData } from "../../src/modules/users/infrastructure/database/seeds/user-test.seed";

dotenv.config();
jest.setTimeout(180_000);

const proofEnabled = process.env.P8_09_POSTGRES_PROOF === "true";
const describeProof = proofEnabled ? describe : describe.skip;

const MANAGED_TABLES = Object.freeze([
  "ad_packages",
  "provinces",
  "product_categories",
  "users",
  "cooperative_members",
  "products",
  "product_images",
  "product_certifications",
  "farmer_profiles",
  "cooperative_profiles",
  "enterprise_profiles",
  "supplier_profiles",
  "reviews",
  "system_configs",
] as const);

type ManagedTable = (typeof MANAGED_TABLES)[number];
type DatabaseRow = Record<string, unknown>;

interface CapturedOutput {
  readonly groupId: string;
  readonly outputKind: string;
  readonly stableKey: string;
  readonly persistedId: string | number | boolean;
}

interface CanonicalRun {
  readonly groupIds: readonly string[];
  readonly outputs: readonly CapturedOutput[];
}

interface ManagedSnapshot {
  readonly counts: Readonly<Record<ManagedTable, number>>;
  readonly state: Readonly<Record<ManagedTable, readonly string[]>>;
  readonly rows: Readonly<Record<ManagedTable, readonly DatabaseRow[]>>;
}

interface RuntimeProofSummary {
  databaseAName: string;
  databaseBName: string;
  migrationsAppliedA: number;
  migrationsAppliedB: number;
  firstRunGroupCount: number;
  secondRunGroupCount: number;
  firstRunOutputCount: number;
  secondRunOutputCount: number;
  firstRunDuplicateCount: number;
  secondRunDuplicateCount: number;
  managedTableCounts: Readonly<Record<ManagedTable, number>>;
  interruptedRunCompletedGroupCount: number;
  interruptedRunStopPoint: string;
  interruptedRunRetryDuplicateCount: number;
}

describeProof("P8-09 disposable PostgreSQL runtime proof", () => {
  const baseEnvironment = explicitLoopbackEnvironment();
  const targetA = createP809Target("repeat");
  const targetB = createP809Target("retry");
  const admin = createAdminDataSource(baseEnvironment, targetA);
  const createdTargets: DisposableDatabaseTestTarget[] = [];
  const dataSources: DataSource[] = [];
  let droppedDatabaseCount = 0;
  let summary: RuntimeProofSummary | undefined;

  beforeAll(async () => {
    await admin.initialize();
    for (const target of [targetA, targetB]) {
      await createDisposableDatabase(admin, target);
      createdTargets.push(target);
    }
  });

  afterAll(async () => {
    for (const dataSource of [...dataSources].reverse()) {
      if (dataSource.isInitialized) await dataSource.destroy();
    }
    if (admin.isInitialized) {
      for (const target of [...createdTargets].reverse()) {
        await dropDisposableDatabase(admin, target);
        droppedDatabaseCount += 1;
      }
      await admin.destroy();
    }
    expect(droppedDatabaseCount).toBe(createdTargets.length);
    process.stdout.write(
      `${JSON.stringify({
        proof: "P8_09_CLEANUP",
        disposableDatabasesCreated: createdTargets.length,
        disposableDatabasesDropped: droppedDatabaseCount,
        status: "PASS",
      })}\n`,
    );
  });

  it("proves repeat idempotency and interrupted-run retry from fresh migration heads", async () => {
    const dataSourceA = await createMigratedDataSource(
      baseEnvironment,
      targetA,
    );
    dataSources.push(dataSourceA);
    const dataSourceB = await createMigratedDataSource(
      baseEnvironment,
      targetB,
    );
    dataSources.push(dataSourceB);

    const migrationsAppliedA = await migrateAndVerifyHead(dataSourceA);
    const migrationsAppliedB = await migrateAndVerifyHead(dataSourceB);
    expect(migrationsAppliedA).toBe(6);
    expect(migrationsAppliedB).toBe(6);

    const firstRun = await executeCanonicalPlan(dataSourceA, targetA);
    expect(firstRun.groupIds).toHaveLength(11);
    expect(new Set(firstRun.groupIds).size).toBe(11);
    const firstSnapshot = await captureManagedSnapshot(dataSourceA);
    const firstDuplicateCount = await logicalIdentityDuplicateCount(
      dataSourceA,
    );
    expect(firstDuplicateCount).toBe(0);
    const firstDevHashes = await capturePasswordHashes(
      dataSourceA,
      userDevSeedData.map(({ email }) => email),
    );
    const firstTestHashes = await capturePasswordHashes(
      dataSourceA,
      userTestIdentitySeedData.map(({ email }) => email),
    );
    const firstCreateOnlyState = await captureCreateOnlyState(dataSourceA);

    const secondRun = await executeCanonicalPlan(dataSourceA, targetA);
    expect(secondRun.groupIds).toEqual(firstRun.groupIds);
    expect(secondRun.outputs).toEqual(firstRun.outputs);
    const secondSnapshot = await captureManagedSnapshot(dataSourceA);
    expect(secondSnapshot.counts).toEqual(firstSnapshot.counts);
    expect(secondSnapshot.state).toEqual(firstSnapshot.state);
    const secondDuplicateCount = await logicalIdentityDuplicateCount(
      dataSourceA,
    );
    expect(secondDuplicateCount).toBe(0);
    expect(
      await capturePasswordHashes(
        dataSourceA,
        userDevSeedData.map(({ email }) => email),
      ),
    ).toEqual(firstDevHashes);
    expect(
      await capturePasswordHashes(
        dataSourceA,
        userTestIdentitySeedData.map(({ email }) => email),
      ),
    ).toEqual(firstTestHashes);
    expect(await captureCreateOnlyState(dataSourceA)).toEqual(
      firstCreateOnlyState,
    );

    const prefixRun = await executeReferenceDevPlan(
      dataSourceB,
      targetB,
      createReferenceDevGroups(dataSourceB).slice(0, 4),
    );
    expect(prefixRun.groupIds).toEqual([
      "ads.reference.packages",
      "geography.reference.provinces",
      "products.reference.categories",
      "users.dev.users",
    ]);
    const retryRun = await executeCanonicalPlan(dataSourceB, targetB);
    expect(retryRun.groupIds).toHaveLength(11);
    const retryDuplicateCount = await logicalIdentityDuplicateCount(
      dataSourceB,
    );
    expect(retryDuplicateCount).toBe(0);
    const retrySnapshot = await captureManagedSnapshot(dataSourceB);
    expect(retrySnapshot.counts).toEqual(secondSnapshot.counts);
    expect(await semanticSnapshot(dataSourceB, retrySnapshot.rows)).toEqual(
      await semanticSnapshot(dataSourceA, secondSnapshot.rows),
    );

    expect(await duplicatePrimaryImageIdentityCount(dataSourceA)).toBe(0);
    expect(await duplicateProductCertificationIdentityCount(dataSourceA)).toBe(
      0,
    );

    summary = {
      databaseAName: targetA.database,
      databaseBName: targetB.database,
      migrationsAppliedA,
      migrationsAppliedB,
      firstRunGroupCount: firstRun.groupIds.length,
      secondRunGroupCount: secondRun.groupIds.length,
      firstRunOutputCount: firstRun.outputs.length,
      secondRunOutputCount: secondRun.outputs.length,
      firstRunDuplicateCount: firstDuplicateCount,
      secondRunDuplicateCount: secondDuplicateCount,
      managedTableCounts: firstSnapshot.counts,
      interruptedRunCompletedGroupCount: prefixRun.groupIds.length,
      interruptedRunStopPoint: `AFTER_${prefixRun.groupIds.at(-1)}`,
      interruptedRunRetryDuplicateCount: retryDuplicateCount,
    };
    process.stdout.write(
      `${JSON.stringify({ proof: "P8_09_RUNTIME", ...summary }, null, 2)}\n`,
    );
  });

  afterEach(() => {
    if (summary) expect(summary.firstRunGroupCount).toBe(11);
  });
});

function explicitLoopbackEnvironment(): Record<string, string | undefined> {
  return {
    ...process.env,
    DATABASE_URL: undefined,
    NODE_ENV: "test",
    DB_HOST: process.env.DB_HOST ?? "127.0.0.1",
    DB_PORT: process.env.DB_PORT ?? "55432",
    DB_USER: process.env.DB_USER ?? "postgres",
    DB_PASS: process.env.DB_PASS,
    DB_NAME: "agrilink_persistence_test_p8_09_admin",
    DB_SYNCHRONIZE: "false",
    DB_LOGGING: "false",
    PRODUCT_DEV_SEED: "false",
    PRODUCT_DEV_SEED_RESET: "false",
  };
}

function createP809Target(suffix: string): DisposableDatabaseTestTarget {
  const database = `agrilink_persistence_test_p8_09_${suffix}_${randomBytes(4).toString("hex")}`;
  assertDisposableDatabaseTarget(database);
  return Object.freeze({
    classification: SeedClassification.TEST,
    purpose: PersistenceTestPurpose.MIGRATION_TEST_HARNESS,
    database,
    acknowledgement: database,
  });
}

async function createMigratedDataSource(
  baseEnvironment: Record<string, string | undefined>,
  target: DisposableDatabaseTestTarget,
): Promise<DataSource> {
  const environment = { ...baseEnvironment, DB_NAME: target.database };
  assertSafePersistenceTestEnvironment({
    environment,
    classification: SeedClassification.TEST,
    purpose: PersistenceTestPurpose.MIGRATION_TEST_HARNESS,
    operation: PersistenceTestOperation.MIGRATION_VERIFICATION,
    acknowledgement: target.database,
  });
  const dataSource = new DataSource(
    createDataSourceOptions(environment, {
      entities: CLI_ENTITY_REGISTRY,
      migrations: V2_MIGRATIONS,
      migrationsTableName: "migrations_v2",
      logging: false,
    }),
  );
  expect(dataSource.options.synchronize).toBe(false);
  await dataSource.initialize();
  excludeDeferredEntitiesFromSchemaBuild(dataSource);
  return dataSource;
}

async function migrateAndVerifyHead(dataSource: DataSource): Promise<number> {
  const applied = await dataSource.runMigrations();
  expect(applied).toHaveLength(V2_MIGRATIONS.length);
  expect(await dataSource.showMigrations()).toBe(false);
  expect(
    await dataSource.query(`SELECT to_regclass('public.cooperative_members')`),
  ).toEqual([{ to_regclass: "cooperative_members" }]);
  assertCanonicalParity(await verifyCanonicalParity(dataSource));
  return applied.length;
}

function createReferenceDevGroups(dataSource: DataSource): readonly SeedGroup[] {
  return Object.freeze([
    createAdsPackageReferenceSeedGroup(dataSource),
    createGeographyProvinceReferenceSeedGroup(dataSource),
    createProductsCategoryReferenceSeedGroup(dataSource),
    createUsersDevSeedGroup(dataSource),
    new CooperativeMemberDevelopmentSeedService(
      new TypeOrmCooperativeMemberDevSeedWriter(
        dataSource.getRepository(CooperativeMemberEntity),
      ),
    ),
    new ProductDevelopmentSeedService(
      new TypeOrmProductDevSeedWriter(
        dataSource.getRepository(Product),
        dataSource.getRepository(ProductImage),
        dataSource.getRepository(ProductCertification),
      ),
    ),
    createProfilesRoleProfilesDevSeedGroup(dataSource),
    new ReviewDevelopmentSeedService(
      new TypeOrmReviewDevSeedWriter(dataSource.getRepository(Review)),
    ),
  ]);
}

async function executeCanonicalPlan(
  dataSource: DataSource,
  target: DisposableDatabaseTestTarget,
): Promise<CanonicalRun> {
  assertFixtureTargetBound(dataSource, target);
  const referenceDev = await executeReferenceDevPlan(
    dataSource,
    target,
    createReferenceDevGroups(dataSource),
  );
  assertFixtureTargetBound(dataSource, target);
  const test = await executeGroups(
    createPhaseEightTestSeedGroups(dataSource),
    seedEnvironment(dataSource, target, "test"),
    [SeedClassification.TEST],
  );
  return Object.freeze({
    groupIds: Object.freeze([...referenceDev.groupIds, ...test.groupIds]),
    outputs: Object.freeze([...referenceDev.outputs, ...test.outputs]),
  });
}

async function executeReferenceDevPlan(
  dataSource: DataSource,
  target: DisposableDatabaseTestTarget,
  groups: readonly SeedGroup[],
): Promise<CanonicalRun> {
  assertFixtureTargetBound(dataSource, target);
  return executeGroups(groups, seedEnvironment(dataSource, target, "development"), [
    SeedClassification.REFERENCE,
    SeedClassification.DEV,
  ]);
}

async function executeGroups(
  groups: readonly SeedGroup[],
  environment: Record<string, unknown>,
  classifications: readonly SeedClassification[],
): Promise<CanonicalRun> {
  const safeTarget = assertSeedExecutionSafety({
    environment,
    classifications,
  });
  const plan = buildSeedExecutionPlan(groups, safeTarget.classifications);
  const registry = new SeedOutputRegistry();
  const outputs: CapturedOutput[] = [];
  for (const group of plan) {
    const result = await group.execute(
      Object.freeze({
        ...safeTarget,
        dependencies: registry.viewFor(group.metadata),
      }),
    );
    registry.register(group.metadata.id, result);
    outputs.push(...captureOutputs(group.metadata.id, result.outputs));
  }
  return Object.freeze({
    groupIds: Object.freeze(plan.map(({ metadata }) => metadata.id)),
    outputs: Object.freeze(outputs),
  });
}

function captureOutputs(
  groupId: string,
  outputs: readonly SeedOutputBinding[],
): readonly CapturedOutput[] {
  return outputs.map(({ kind, key, value }) =>
    Object.freeze({
      groupId,
      outputKind: kind,
      stableKey: key,
      persistedId: value,
    }),
  );
}

function seedEnvironment(
  dataSource: DataSource,
  target: DisposableDatabaseTestTarget,
  nodeEnv: "development" | "test",
): Record<string, unknown> {
  const options = postgresOptions(dataSource);
  return {
    DATABASE_URL: undefined,
    NODE_ENV: nodeEnv,
    DB_HOST: String(options.host),
    DB_NAME: target.database,
  };
}

function assertFixtureTargetBound(
  dataSource: DataSource,
  target: DisposableDatabaseTestTarget,
): void {
  const options = postgresOptions(dataSource);
  const requested = assertSafePersistenceTestEnvironment({
    environment: {
      DATABASE_URL: undefined,
      DB_HOST: String(options.host),
      DB_NAME: target.database,
    },
    classification: SeedClassification.TEST,
    purpose: PersistenceTestPurpose.BUSINESS_FIXTURE,
    operation: PersistenceTestOperation.FIXTURE_WRITE,
  });
  const actual = assertSafePersistenceTestEnvironment({
    environment: {
      DATABASE_URL: options.url,
      DB_HOST: options.host,
      DB_NAME: options.database,
    },
    classification: SeedClassification.TEST,
    purpose: PersistenceTestPurpose.BUSINESS_FIXTURE,
    operation: PersistenceTestOperation.FIXTURE_WRITE,
  });
  expect(actual.host).toBe(requested.host);
  expect(actual.database).toBe(requested.database);
}

function postgresOptions(dataSource: DataSource) {
  const options = dataSource.options;
  if (options.type !== "postgres") {
    throw new Error("P8-09 runtime proof requires PostgreSQL");
  }
  return options;
}

async function captureManagedSnapshot(
  dataSource: DataSource,
): Promise<ManagedSnapshot> {
  const counts = {} as Record<ManagedTable, number>;
  const state = {} as Record<ManagedTable, readonly string[]>;
  const rowsByTable = {} as Record<ManagedTable, readonly DatabaseRow[]>;
  for (const table of MANAGED_TABLES) {
    const rows = (await dataSource.query(
      `SELECT * FROM "public"."${table}"`,
    )) as DatabaseRow[];
    rowsByTable[table] = rows;
    counts[table] = rows.length;
    state[table] = rows
      .map((row) => stableRow(row, new Set(["updated_at"])))
      .sort();
  }
  return Object.freeze({ counts, state, rows: rowsByTable });
}

function stableRow(row: DatabaseRow, omitted: ReadonlySet<string>): string {
  const normalized = Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => !omitted.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, normalizeValue(value)]),
  );
  return JSON.stringify(normalized);
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (Array.isArray(value)) return value.map(normalizeValue);
  return value;
}

async function capturePasswordHashes(
  dataSource: DataSource,
  emails: readonly string[],
): Promise<Readonly<Record<string, string>>> {
  const rows = (await dataSource.query(
    `SELECT email, password_hash FROM public.users WHERE email = ANY($1::text[]) ORDER BY email`,
    [emails],
  )) as Array<{ email: string; password_hash: string }>;
  expect(rows).toHaveLength(emails.length);
  return Object.freeze(
    Object.fromEntries(rows.map(({ email, password_hash }) => [email, password_hash])),
  );
}

async function captureCreateOnlyState(
  dataSource: DataSource,
): Promise<readonly string[]> {
  const rows = (await dataSource.query(`
    SELECT 'cooperative_members' AS kind,
           cooperative.email || '|' || farmer.email AS stable_key,
           member.joined_at::text AS value
      FROM public.cooperative_members member
      JOIN public.users cooperative ON cooperative.id = member.cooperative_id
      JOIN public.users farmer ON farmer.id = member.farmer_id
    UNION ALL
    SELECT 'farmer_profiles', users.email, profiles.verified_at::text
      FROM public.farmer_profiles profiles
      JOIN public.users users ON users.id = profiles.user_id
    UNION ALL
    SELECT 'cooperative_profiles', users.email, profiles.verified_at::text
      FROM public.cooperative_profiles profiles
      JOIN public.users users ON users.id = profiles.user_id
    ORDER BY 1, 2
  `)) as Array<{ kind: string; stable_key: string; value: string | null }>;
  return Object.freeze(rows.map((row) => JSON.stringify(row)));
}

async function logicalIdentityDuplicateCount(
  dataSource: DataSource,
): Promise<number> {
  const identities = [
    `SELECT count(*) AS row_count FROM public.ad_packages GROUP BY package_code HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.provinces GROUP BY code HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.product_categories GROUP BY slug HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.users WHERE email IS NOT NULL GROUP BY email HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.users WHERE phone IS NOT NULL GROUP BY phone HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.products WHERE sku IS NOT NULL GROUP BY sku HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.cooperative_members GROUP BY cooperative_id, farmer_id HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.reviews WHERE product_id IS NOT NULL GROUP BY reviewer_id, product_id HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.product_images WHERE is_primary IS TRUE GROUP BY product_id HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.product_certifications WHERE cert_number IS NOT NULL GROUP BY product_id, cert_number HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.farmer_profiles WHERE user_id IS NOT NULL GROUP BY user_id HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.farmer_profiles GROUP BY cccd_number HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.cooperative_profiles WHERE user_id IS NOT NULL GROUP BY user_id HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.cooperative_profiles GROUP BY business_license_number HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.cooperative_profiles GROUP BY tax_code HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.enterprise_profiles WHERE user_id IS NOT NULL GROUP BY user_id HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.enterprise_profiles GROUP BY tax_code HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.supplier_profiles GROUP BY user_id HAVING count(*) > 1`,
    `SELECT count(*) AS row_count FROM public.system_configs GROUP BY "key" HAVING count(*) > 1`,
  ];
  const counts = await Promise.all(
    identities.map(async (identity) => {
      const rows = (await dataSource.query(identity)) as Array<{
        row_count: string;
      }>;
      return rows.reduce(
        (sum, { row_count }) => sum + Number(row_count) - 1,
        0,
      );
    }),
  );
  return counts.reduce((sum, count) => sum + count, 0);
}

async function duplicatePrimaryImageIdentityCount(
  dataSource: DataSource,
): Promise<number> {
  return duplicateExtraCount(
    dataSource,
    `SELECT count(*) AS row_count FROM public.product_images WHERE is_primary IS TRUE GROUP BY product_id HAVING count(*) > 1`,
  );
}

async function duplicateProductCertificationIdentityCount(
  dataSource: DataSource,
): Promise<number> {
  return duplicateExtraCount(
    dataSource,
    `SELECT count(*) AS row_count FROM public.product_certifications WHERE cert_number IS NOT NULL GROUP BY product_id, cert_number HAVING count(*) > 1`,
  );
}

async function duplicateExtraCount(
  dataSource: DataSource,
  query: string,
): Promise<number> {
  const rows = (await dataSource.query(query)) as Array<{ row_count: string }>;
  return rows.reduce(
    (sum, { row_count }) => sum + Number(row_count) - 1,
    0,
  );
}

async function semanticSnapshot(
  dataSource: DataSource,
  rowsByTable: Readonly<Record<ManagedTable, readonly DatabaseRow[]>>,
): Promise<Readonly<Record<ManagedTable, readonly string[]>>> {
  const identityById = new Map<string, string>();
  registerIdentity(identityById, rowsByTable.users, "email", "user");
  registerIdentity(identityById, rowsByTable.provinces, "code", "province");
  registerIdentity(
    identityById,
    rowsByTable.product_categories,
    "slug",
    "category",
  );
  registerIdentity(identityById, rowsByTable.products, "sku", "product");
  const semantic = {} as Record<ManagedTable, readonly string[]>;
  const omitted = new Set([
    "created_at",
    "updated_at",
    "joined_at",
    "verified_at",
    "password_hash",
  ]);

  for (const table of MANAGED_TABLES) {
    semantic[table] = rowsByTable[table]
      .map((row) => {
        const normalized = Object.fromEntries(
          Object.entries(row)
            .filter(([key]) => !omitted.has(key))
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, value]) => [
              key,
              key === "id"
                ? semanticPrimaryId(table, row, identityById)
                : replaceReferencedIdentity(value, identityById),
            ]),
        );
        return JSON.stringify(normalized);
      })
      .sort();
  }
  expect(await logicalIdentityDuplicateCount(dataSource)).toBe(0);
  return Object.freeze(semantic);
}

function registerIdentity(
  identityById: Map<string, string>,
  rows: readonly DatabaseRow[],
  stableKey: string,
  prefix: string,
): void {
  for (const row of rows) {
    if (typeof row.id === "string") {
      identityById.set(row.id, `${prefix}:${String(row[stableKey])}`);
    }
  }
}

function semanticPrimaryId(
  table: ManagedTable,
  row: DatabaseRow,
  identityById: ReadonlyMap<string, string>,
): string {
  if (typeof row.id === "string" && identityById.has(row.id)) {
    return identityById.get(row.id) as string;
  }
  const stableKeys: Partial<Record<ManagedTable, readonly string[]>> = {
    ad_packages: ["package_code"],
    cooperative_members: ["cooperative_id", "farmer_id"],
    product_images: ["product_id", "is_primary"],
    product_certifications: ["product_id", "cert_number"],
    farmer_profiles: ["user_id"],
    cooperative_profiles: ["user_id"],
    enterprise_profiles: ["user_id"],
    supplier_profiles: ["user_id"],
    reviews: ["reviewer_id", "product_id"],
    system_configs: ["key"],
  };
  const parts = (stableKeys[table] ?? []).map((key) =>
    String(replaceReferencedIdentity(row[key], identityById)),
  );
  return `${table}:${parts.join("|")}`;
}

function replaceReferencedIdentity(
  value: unknown,
  identityById: ReadonlyMap<string, string>,
): unknown {
  if (typeof value === "string" && identityById.has(value)) {
    return identityById.get(value);
  }
  return normalizeValue(value);
}
