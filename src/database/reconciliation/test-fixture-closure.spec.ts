import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { DataSource } from "typeorm";
import { SeedClassification } from "../seeds/framework/seed-contract";
import { orderSeedMetadata } from "../seeds/framework/seed-metadata";
import { createPhaseEightTestSeedGroups } from "../seeds/test-seed-groups.registry";
import { CLEAN_V2_WRITE_INVENTORY } from "./clean-v2-write-inventory";

type TestSourceClassification =
  | "BUSINESS_FIXTURE"
  | "MIGRATION_TEST_HARNESS"
  | "READ_ONLY_TEST_HARNESS"
  | "TEST_INFRASTRUCTURE";

type TestSourceDisposition =
  | "CONSUMES_OWNER_LOCAL_TEST_PROVIDER"
  | "KEEP_BOUNDED_TEST_HARNESS"
  | "KEEP_MIGRATION_LOCAL_COMPATIBILITY_FIXTURE";

interface TestSourceClosureEntry {
  readonly id: string;
  readonly source: string;
  readonly classification: TestSourceClassification;
  readonly databaseCapable: "YES" | "CALLER_ONLY";
  readonly explicitTestPurpose: "DIRECT" | "INHERITED" | "CALLER_REQUIRED";
  readonly businessFixtureWrites: string;
  readonly reusableFixtureOwner: string;
  readonly harnessLocalWrites: string;
  readonly crossOwnerReusableWrites: 0;
  readonly finalDisposition: TestSourceDisposition;
  readonly newProviderCandidate: false;
}

const SOURCES: readonly TestSourceClosureEntry[] = Object.freeze([
  source(
    "TF-01",
    "src/scripts/persistence-verify-clean-v2.ts",
    "MIGRATION_TEST_HARNESS",
    "YES",
    "DIRECT",
    "DELEGATES_TF02",
    "NONE",
    "MIGRATION_AND_PARITY_CONTROLS",
    "KEEP_BOUNDED_TEST_HARNESS",
  ),
  source(
    "TF-02",
    "src/database/reconciliation/clean-v2-runtime-baseline.ts",
    "BUSINESS_FIXTURE",
    "CALLER_ONLY",
    "DIRECT",
    "14_RAW_PREREQUISITES_PLUS_1_ADMIN_PROVIDER_PLUS_2_WORKFLOW_ACTIONS",
    "admin.system_configs",
    "SYNTHETIC_COMPATIBILITY_AND_WORKFLOW",
    "CONSUMES_OWNER_LOCAL_TEST_PROVIDER",
  ),
  source(
    "TF-03",
    "src/database/reconciliation/disposable-database.ts",
    "TEST_INFRASTRUCTURE",
    "CALLER_ONLY",
    "CALLER_REQUIRED",
    "NONE",
    "NONE",
    "DATABASE_LIFECYCLE_ONLY",
    "KEEP_BOUNDED_TEST_HARNESS",
  ),
  source(
    "TF-04",
    "test/commerce.e2e-spec.ts",
    "BUSINESS_FIXTURE",
    "YES",
    "INHERITED",
    "SHARED_USERS_PRODUCTS_PROVIDERS_PLUS_COMMERCE_WORKFLOW",
    "users;products",
    "UNRELATED_ACTORS_AND_WORKFLOW",
    "CONSUMES_OWNER_LOCAL_TEST_PROVIDER",
  ),
  source(
    "TF-05",
    "test/persistence-phase-6/repository-concurrency.integration.spec.ts",
    "BUSINESS_FIXTURE",
    "YES",
    "INHERITED",
    "SHARED_USERS_PRODUCTS_PROVIDERS_PLUS_CONCURRENCY_WORKFLOW",
    "users;products",
    "UNRELATED_ACTORS_AND_WORKFLOW",
    "CONSUMES_OWNER_LOCAL_TEST_PROVIDER",
  ),
  source(
    "TF-06",
    "test/persistence-phase-7a/notifications-concurrency.integration.spec.ts",
    "BUSINESS_FIXTURE",
    "YES",
    "INHERITED",
    "NOTIFICATION_ROWS_FOR_CURRENT_TEST",
    "NONE",
    "OWNER_BOUNDED_WORKFLOW_AND_CLEANUP",
    "KEEP_BOUNDED_TEST_HARNESS",
  ),
  source(
    "TF-07",
    "test/persistence-phase-7b/traceability-postgres.integration-spec.ts",
    "BUSINESS_FIXTURE",
    "YES",
    "DIRECT",
    "TRACEABILITY_WORKFLOW_AND_NEGATIVE_CONSTRAINT_ROW",
    "NONE",
    "OWNER_BOUNDED_WORKFLOW_AND_CLEANUP",
    "KEEP_BOUNDED_TEST_HARNESS",
  ),
  source(
    "TF-08",
    "test/storage-phase9-migration.integration-spec.ts",
    "MIGRATION_TEST_HARNESS",
    "YES",
    "DIRECT",
    "8_MIGRATION_COMPATIBILITY_INSERTS",
    "NONE",
    "LEGACY_SCHEMA_AND_DOCUMENT_ROWS",
    "KEEP_MIGRATION_LOCAL_COMPATIBILITY_FIXTURE",
  ),
  source(
    "TF-09",
    "src/scripts/verify-p3-phase-1-migration.ts",
    "MIGRATION_TEST_HARNESS",
    "YES",
    "DIRECT",
    "NONE",
    "NONE",
    "LEGACY_SCHEMA_COMPATIBILITY_ONLY",
    "KEEP_MIGRATION_LOCAL_COMPATIBILITY_FIXTURE",
  ),
  source(
    "TF-10",
    "src/scripts/persistence-write-phase-6-catalog.ts",
    "MIGRATION_TEST_HARNESS",
    "YES",
    "INHERITED",
    "NONE",
    "NONE",
    "MIGRATION_CATALOG_CONTROLS",
    "KEEP_BOUNDED_TEST_HARNESS",
  ),
  source(
    "TF-11",
    "src/scripts/persistence-schema-parity.ts",
    "READ_ONLY_TEST_HARNESS",
    "YES",
    "DIRECT",
    "NONE",
    "NONE",
    "READ_ONLY_CATALOG_INSPECTION",
    "KEEP_BOUNDED_TEST_HARNESS",
  ),
  source(
    "TF-12",
    "src/scripts/persistence-typeorm-compatibility-parity.ts",
    "READ_ONLY_TEST_HARNESS",
    "YES",
    "DIRECT",
    "NONE",
    "NONE",
    "READ_ONLY_CATALOG_INSPECTION",
    "KEEP_BOUNDED_TEST_HARNESS",
  ),
  source(
    "TF-13",
    "src/scripts/persistence-print-baseline-schema.ts",
    "READ_ONLY_TEST_HARNESS",
    "YES",
    "DIRECT",
    "NONE",
    "NONE",
    "UNAPPLIED_SCHEMA_LOG",
    "KEEP_BOUNDED_TEST_HARNESS",
  ),
  source(
    "TF-14",
    "src/scripts/persistence-write-baseline-manifests.ts",
    "READ_ONLY_TEST_HARNESS",
    "YES",
    "DIRECT",
    "NONE",
    "NONE",
    "READ_ONLY_CATALOG_AND_FILE_OUTPUT",
    "KEEP_BOUNDED_TEST_HARNESS",
  ),
  source(
    "TF-15",
    "src/scripts/persistence-migration-verification-data-source.ts",
    "MIGRATION_TEST_HARNESS",
    "YES",
    "DIRECT",
    "NONE",
    "NONE",
    "MIGRATION_DATASOURCE_ONLY",
    "KEEP_MIGRATION_LOCAL_COMPATIBILITY_FIXTURE",
  ),
]);

function source(
  id: string,
  file: string,
  classification: TestSourceClassification,
  databaseCapable: "YES" | "CALLER_ONLY",
  explicitTestPurpose: "DIRECT" | "INHERITED" | "CALLER_REQUIRED",
  businessFixtureWrites: string,
  reusableFixtureOwner: string,
  harnessLocalWrites: string,
  finalDisposition: TestSourceDisposition,
): Readonly<TestSourceClosureEntry> {
  return Object.freeze({
    id,
    source: file,
    classification,
    databaseCapable,
    explicitTestPurpose,
    businessFixtureWrites,
    reusableFixtureOwner,
    harnessLocalWrites,
    crossOwnerReusableWrites: 0,
    finalDisposition,
    newProviderCandidate: false,
  });
}

const ROOT = process.cwd();

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

function insertStatements(sourceText: string): readonly string[] {
  return [...sourceText.matchAll(/`INSERT INTO[\s\S]*?`/g)].map(
    ([statement]) => statement,
  );
}

describe("P8-06E TEST fixture ownership closure", () => {
  it("classifies all 15 current persistence sources with final dispositions", () => {
    expect(SOURCES).toHaveLength(15);
    expect(new Set(SOURCES.map(({ id }) => id)).size).toBe(15);
    expect(SOURCES.map(({ id }) => id)).toEqual(
      Array.from(
        { length: 15 },
        (_, index) => `TF-${String(index + 1).padStart(2, "0")}`,
      ),
    );
    for (const entry of SOURCES) {
      expect(existsSync(join(ROOT, entry.source))).toBe(true);
      expect(entry.classification).toBeDefined();
      expect(entry.explicitTestPurpose).toBeDefined();
      expect(entry.finalDisposition).not.toContain("UNKNOWN");
      expect(entry.crossOwnerReusableWrites).toBe(0);
      expect(entry.newProviderCandidate).toBe(false);
    }
  });

  it("retains an explicit safe TEST purpose for every database boundary", () => {
    const coverage = [
      [
        "src/scripts/persistence-verify-clean-v2.ts",
        "createAdminDataSource(process.env, testTarget)",
      ],
      [
        "src/database/reconciliation/clean-v2-runtime-baseline.ts",
        "CLEAN_V2_TEST_FIXTURE_METADATA",
      ],
      [
        "src/database/reconciliation/disposable-database.ts",
        "assertSafePersistenceTestTarget",
      ],
      [
        "test/commerce.e2e-spec.ts",
        "createAdminDataSource(process.env, testTarget)",
      ],
      [
        "test/persistence-phase-6/repository-concurrency.integration.spec.ts",
        "createAdminDataSource(process.env, testTarget)",
      ],
      [
        "test/persistence-phase-7a/notifications-concurrency.integration.spec.ts",
        "createAdminDataSource(process.env, testTarget)",
      ],
      [
        "test/persistence-phase-7b/traceability-postgres.integration-spec.ts",
        "assertSafePersistenceTestEnvironment",
      ],
      [
        "test/storage-phase9-migration.integration-spec.ts",
        "assertSafePersistenceTestEnvironment",
      ],
      [
        "src/scripts/verify-p3-phase-1-migration.ts",
        "assertSafePersistenceTestEnvironment",
      ],
      [
        "src/scripts/persistence-write-phase-6-catalog.ts",
        "createAdminDataSource(process.env, testTarget)",
      ],
      [
        "src/scripts/persistence-schema-parity.ts",
        "assertSafePersistenceTestEnvironment",
      ],
      [
        "src/scripts/persistence-typeorm-compatibility-parity.ts",
        "assertSafePersistenceTestEnvironment",
      ],
      [
        "src/scripts/persistence-print-baseline-schema.ts",
        "assertSafePersistenceTestEnvironment",
      ],
      [
        "src/scripts/persistence-write-baseline-manifests.ts",
        "assertSafePersistenceTestEnvironment",
      ],
      [
        "src/scripts/persistence-migration-verification-data-source.ts",
        "assertSafePersistenceTestEnvironment",
      ],
    ] as const;

    for (const [file, marker] of coverage) {
      expect(read(file)).toContain(marker);
    }
  });

  it("closes the current three-group TEST DAG without DEV dependencies", () => {
    const dataSource = {
      getRepository: jest.fn(() => ({})),
    } as unknown as DataSource;
    const groups = createPhaseEightTestSeedGroups(dataSource);
    const metadata = groups.map(({ metadata: value }) => value);
    const ids = new Set(metadata.map(({ id }) => id));
    const dependencies = metadata.flatMap(({ dependencies: values }) => values);

    expect(metadata.map(({ id }) => id)).toEqual([
      "users.test.identities",
      "products.test.catalog",
      "admin.test.system-configs",
    ]);
    expect(
      metadata.every(
        ({ classification }) => classification === SeedClassification.TEST,
      ),
    ).toBe(true);
    expect(ids.size).toBe(3);
    expect(dependencies).toEqual(["users.test.identities"]);
    expect(dependencies.filter((dependency) => !ids.has(dependency))).toEqual(
      [],
    );
    expect(orderSeedMetadata(metadata)).toHaveLength(3);
    expect(
      metadata.some(
        ({ classification }) => classification === SeedClassification.DEV,
      ),
    ).toBe(false);
  });

  it("keeps one owner for each reusable TEST fixture", () => {
    const tf04Inserts = insertStatements(read("test/commerce.e2e-spec.ts"));
    const tf05Inserts = insertStatements(
      read(
        "test/persistence-phase-6/repository-concurrency.integration.spec.ts",
      ),
    );
    const cleanV2 = read(
      "src/database/reconciliation/clean-v2-runtime-baseline.ts",
    );

    for (const inserts of [tf04Inserts, tf05Inserts]) {
      expect(inserts).toHaveLength(1);
      expect(inserts.join("\n")).not.toContain("seller@example.test");
      expect(inserts.join("\n")).not.toContain("INSERT INTO products");
    }
    expect(cleanV2).not.toContain("INSERT INTO system_configs");
    expect(
      read("src/modules/users/infrastructure/database/seeds/user-test.seed.ts"),
    ).toContain("seller@example.test");
    expect(
      read(
        "src/modules/products/infrastructure/database/seeds/product-test.seed.ts",
      ),
    ).toContain("TEST-COMMERCE-RICE-001");
    expect(
      read(
        "src/modules/admin/infrastructure/database/seeds/system-config-test.seed.ts",
      ),
    ).toContain('key: "phase1"');
  });

  it("preserves clean-v2 synthetic and workflow-local decisions", () => {
    const dispositions = new Map(
      CLEAN_V2_WRITE_INVENTORY.map(({ id, currentDisposition }) => [
        id,
        currentDisposition,
      ]),
    );
    for (const id of ["CV2-F01", "CV2-F03", "CV2-F04"]) {
      expect(dispositions.get(id)).toBe("KEEP_HARNESS_LOCAL_SYNTHETIC_FIXTURE");
    }
    for (const id of ["CV2-W01", "CV2-W02"]) {
      expect(dispositions.get(id)).toBe("KEEP_HARNESS_LOCAL_WORKFLOW_ACTION");
    }
    expect(dispositions.get("CV2-F13")).toBe(
      "MOVE_TO_OWNER_LOCAL_TEST_PROVIDER",
    );
  });

  it("keeps migration compatibility fixtures local", () => {
    const tf08 = read("test/storage-phase9-migration.integration-spec.ts");
    const tf09 = read("src/scripts/verify-p3-phase-1-migration.ts");
    const tf15 = read(
      "src/scripts/persistence-migration-verification-data-source.ts",
    );

    expect(insertStatements(tf08)).toHaveLength(8);
    expect(tf08).toContain("product-external");
    expect(tf08).toContain("quality_certificates");
    expect(tf09).not.toContain("INSERT INTO");
    expect(tf09).toContain('CREATE TABLE "cooperative_members"');
    expect(tf15).not.toContain("INSERT INTO");
    expect(tf15).toContain("MIGRATION_TEST_HARNESS");
  });

  it("introduces no unjustified canonical reference duplicate", () => {
    const allSources = SOURCES.map(({ source: file }) => read(file)).join("\n");
    const cleanV2 = read(
      "src/database/reconciliation/clean-v2-runtime-baseline.ts",
    );

    for (const groupId of [
      "geography.reference.provinces",
      "products.reference.categories",
      "ads.reference.packages",
    ]) {
      expect(allSources).not.toContain(groupId);
    }
    expect(cleanV2).toContain("'Phase One Province', 'P1'");
    expect(cleanV2).toContain("'Phase One Category', 'phase-one-category'");
    expect(cleanV2).toContain("'Phase One Package'");
  });

  it("keeps reusable TEST providers owner-local and output-coupled", () => {
    const users = read(
      "src/modules/users/infrastructure/database/seeds/user-test.seed.ts",
    );
    const products = read(
      "src/modules/products/infrastructure/database/seeds/product-test.seed.ts",
    );
    const admin = read(
      "src/modules/admin/infrastructure/database/seeds/system-config-test.seed.ts",
    );

    expect(users).not.toMatch(/modules\/(?:products|admin)\/infrastructure/);
    expect(products).not.toMatch(/modules\/users\/infrastructure|User\b/);
    expect(products).toContain("USER_ID_BY_EMAIL_OUTPUT_KIND");
    expect(admin).not.toMatch(/modules\/(?:users|products)\/infrastructure/);
  });

  it("retains #149 target binding before repository-backed group creation", () => {
    const adapter = read("src/database/seeds/test-seed-output-executor.ts");
    const requestGuard = adapter.indexOf("assertSeedExecutionSafety(request)");
    const targetBinding = adapter.indexOf(
      "assertDataSourceTargetMatchesRequest(",
      requestGuard,
    );
    const repositoryBoundary = adapter.indexOf(
      "const groups = createSharedTestIdentitySeedGroups(dataSource)",
    );

    expect(requestGuard).toBeGreaterThan(-1);
    expect(targetBinding).toBeGreaterThan(requestGuard);
    expect(repositoryBoundary).toBeGreaterThan(targetBinding);
    expect(adapter).toContain("const options = dataSource.options");
    expect(adapter).toContain("TEST_DATASOURCE_TARGET_MISMATCH");
    expect(adapter).not.toContain(".initialize(");
    expect(adapter).not.toMatch(/seller@example\.test|TEST-COMMERCE-RICE-001/);
  });

  it("keeps TEST groups out of normal startup and CLI", () => {
    const normal = read("src/main.ts") + read("src/app.module.ts");
    const cli = read("src/database/seeds/seed.ts");
    for (const sourceText of [normal, cli]) {
      expect(sourceText).not.toMatch(
        /createPhaseEightTestSeedGroups|createSharedTestIdentitySeedGroups|admin\.test\.system-configs|users\.test\.identities|products\.test\.catalog/,
      );
    }
    expect(cli).not.toContain("SeedClassification.TEST");
  });
});
