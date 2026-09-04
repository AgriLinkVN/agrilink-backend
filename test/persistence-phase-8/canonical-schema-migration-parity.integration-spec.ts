import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";

import { createDataSourceOptions } from "../../src/database/data-source-options";
import {
  CLI_ENTITY_REGISTRY,
  excludeDeferredEntitiesFromSchemaBuild,
} from "../../src/database/entity-registry";
import { V2_MIGRATIONS } from "../../src/database/migration-registry";
import { captureCatalogSnapshot } from "../../src/database/reconciliation/catalog-inspector";
import {
  createAdminDataSource,
  createDisposableDatabase,
  createDisposableDatabaseName,
  dropDisposableDatabase,
} from "../../src/database/reconciliation/disposable-database";
import { PersistenceTestPurpose } from "../../src/database/reconciliation/database-target.guard";
import {
  assertCanonicalParity,
  verifyCanonicalParity,
} from "../../src/database/reconciliation/parity-verifier";
import { SeedClassification } from "../../src/database/seeds/framework/seed-contract";

dotenv.config();
jest.setTimeout(120_000);

const proofEnabled = process.env.P8_09A_POSTGRES_PROOF === "true";
const describeProof = proofEnabled ? describe : describe.skip;

const CANONICAL_SEEDED_TABLES = Object.freeze([
  "ad_packages",
  "cooperative_members",
  "cooperative_profiles",
  "enterprise_profiles",
  "farmer_profiles",
  "product_categories",
  "product_certifications",
  "product_images",
  "products",
  "provinces",
  "reviews",
  "supplier_profiles",
  "system_configs",
  "users",
]);

const COOPERATIVE_COLUMNS = Object.freeze([
  "cooperative_id",
  "created_at",
  "farmer_id",
  "id",
  "joined_at",
  "role",
  "status",
  "updated_at",
]);

describeProof("P8-09A disposable migration-head schema parity", () => {
  const database = createDisposableDatabaseName();
  const target = {
    classification: SeedClassification.TEST,
    purpose: PersistenceTestPurpose.MIGRATION_TEST_HARNESS,
    database,
    acknowledgement: database,
  } as const;
  const environment = {
    ...process.env,
    DATABASE_URL: undefined,
    DB_NAME: database,
    DB_SYNCHRONIZE: "false",
  };
  const admin = createAdminDataSource(environment, target);
  let dataSource: DataSource;
  let tablesBeforeDown: string[];

  beforeAll(async () => {
    await admin.initialize();
    await createDisposableDatabase(admin, target);
    dataSource = new DataSource(
      createDataSourceOptions(environment, {
        entities: CLI_ENTITY_REGISTRY,
        migrations: V2_MIGRATIONS,
        migrationsTableName: "migrations_v2",
        logging: false,
      }),
    );
    await dataSource.initialize();
    excludeDeferredEntitiesFromSchemaBuild(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (admin.isInitialized) {
      await dropDisposableDatabase(admin, target);
      await admin.destroy();
    }
  });

  it("migrates an empty database to canonical schema head", async () => {
    const applied = await dataSource.runMigrations();
    expect(applied).toHaveLength(V2_MIGRATIONS.length);
    expect(await dataSource.showMigrations()).toBe(false);

    const snapshot = await captureCatalogSnapshot(dataSource);
    tablesBeforeDown = snapshot.tables.map(({ name }) => name);
    for (const table of CANONICAL_SEEDED_TABLES) {
      expect(tablesBeforeDown).toContain(table);
    }

    assertCooperativeSchema(snapshot);
    assertCanonicalParity(await verifyCanonicalParity(dataSource));
  });

  it("reverts only the corrective contribution", async () => {
    await dataSource.undoLastMigration();
    const snapshot = await captureCatalogSnapshot(dataSource);
    const tablesAfterDown = snapshot.tables.map(({ name }) => name);

    expect(tablesAfterDown).toEqual(
      tablesBeforeDown.filter((table) => table !== "cooperative_members"),
    );
    expect(await dataSource.showMigrations()).toBe(true);
  });

  it("reapplies the correction and restores exact parity", async () => {
    const reapplied = await dataSource.runMigrations();
    expect(reapplied.map(({ name }) => name)).toEqual([
      "RestoreCanonicalCooperativeMemberSchema1800000005000",
    ]);
    expect(await dataSource.showMigrations()).toBe(false);

    const snapshot = await captureCatalogSnapshot(dataSource);
    expect(snapshot.tables.map(({ name }) => name)).toEqual(tablesBeforeDown);
    assertCooperativeSchema(snapshot);
    assertCanonicalParity(await verifyCanonicalParity(dataSource));
  });
});

function assertCooperativeSchema(
  snapshot: Awaited<ReturnType<typeof captureCatalogSnapshot>>,
): void {
  const table = snapshot.tables.find(
    ({ name }) => name === "cooperative_members",
  );
  expect(table).toBeDefined();
  expect(table?.columns.map(({ name }) => name)).toEqual(COOPERATIVE_COLUMNS);
  expect(table?.constraints.map(({ name }) => name).sort()).toEqual([
    "PK_21a623647dd89d31e42f4e4fe09",
    "ck_p3_member_status",
    "fk_p3_member_cooperative",
    "fk_p3_member_farmer",
    "uq_p3_member_cooperative_farmer",
  ]);
  expect(
    table?.constraints.find(({ name }) => name === "fk_p3_member_cooperative"),
  ).toEqual(expect.objectContaining({ onDelete: "CASCADE" }));
  expect(
    table?.constraints.find(({ name }) => name === "fk_p3_member_farmer"),
  ).toEqual(expect.objectContaining({ onDelete: "RESTRICT" }));
  expect(table?.indexes.map(({ name }) => name).sort()).toEqual([
    "PK_21a623647dd89d31e42f4e4fe09",
    "idx_p3_member_cooperative_status",
    "uq_p3_member_cooperative_farmer",
  ]);
}
