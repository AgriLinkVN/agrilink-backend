import * as fs from "fs";
import * as path from "path";

interface GuardCoverage {
  readonly id: string;
  readonly source: string;
  readonly guardAuthority: string;
  readonly markers: readonly string[];
}

const ROOT = process.cwd();
const BUSINESS_TEST_GROUP_IDS = [
  "users.test.identities",
  "profiles.test.participants",
  "products.test.catalog",
  "reviews.test.feedback",
  "notifications.test.notifications",
  "storage.test.files",
  "ads.test.campaigns",
  "forum.test.posts",
  "admin.test.system-and-audit",
  "compliance.test.incidents",
  "orders.test.orders",
  "commerce.test.operations",
  "payments.test.payments",
  "contracts.test.contracts",
  "traceability.test.lifecycle",
] as const;

const COVERAGE: readonly GuardCoverage[] = [
  inherited("TF-01", "src/scripts/persistence-verify-clean-v2.ts"),
  {
    id: "TF-02",
    source:
      "src/database/reconciliation/clean-v2-runtime-baseline.ts",
    guardAuthority: "src/scripts/persistence-verify-clean-v2.ts",
    markers: ["captureRuntimeBaseline", "PersistenceTestPurpose.MIGRATION_TEST_HARNESS"],
  },
  {
    id: "TF-03",
    source: "src/database/reconciliation/disposable-database.ts",
    guardAuthority: "src/database/reconciliation/disposable-database.ts",
    markers: ["assertSafePersistenceTestTarget", "assertLifecycleTarget"],
  },
  inherited("TF-04", "test/commerce.e2e-spec.ts"),
  inherited(
    "TF-05",
    "test/persistence-phase-6/repository-concurrency.integration.spec.ts",
  ),
  inherited(
    "TF-06",
    "test/persistence-phase-7a/notifications-concurrency.integration.spec.ts",
  ),
  direct(
    "TF-07",
    "test/persistence-phase-7b/traceability-postgres.integration-spec.ts",
  ),
  direct("TF-08", "test/storage-phase9-migration.integration-spec.ts"),
  direct("TF-09", "src/scripts/verify-p3-phase-1-migration.ts"),
  inherited("TF-10", "src/scripts/persistence-write-phase-6-catalog.ts"),
  direct("TF-11", "src/scripts/persistence-schema-parity.ts"),
  direct("TF-12", "src/scripts/persistence-typeorm-compatibility-parity.ts"),
  direct("TF-13", "src/scripts/persistence-print-baseline-schema.ts"),
  direct("TF-14", "src/scripts/persistence-write-baseline-manifests.ts"),
  direct(
    "TF-15",
    "src/scripts/persistence-migration-verification-data-source.ts",
  ),
];

function direct(id: string, source: string): GuardCoverage {
  return {
    id,
    source,
    guardAuthority: source,
    markers: ["assertSafePersistenceTestEnvironment", "SeedClassification.TEST"],
  };
}

function inherited(id: string, source: string): GuardCoverage {
  return {
    id,
    source,
    guardAuthority: source,
    markers: ["createAdminDataSource(process.env, testTarget)", "SeedClassification.TEST"],
  };
}

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function sourceFiles(directory: string): string[] {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(target);
      return entry.isFile() && target.endsWith(".ts") ? [target] : [];
    });
}

describe("P8-06A persistence TEST entrypoint safety", () => {
  it("covers all 15 audited database-capable sources", () => {
    expect(COVERAGE).toHaveLength(15);
    expect(new Set(COVERAGE.map(({ id }) => id)).size).toBe(15);
    for (const entry of COVERAGE) {
      expect(fs.existsSync(path.join(ROOT, entry.source))).toBe(true);
      const authority = read(entry.guardAuthority);
      for (const marker of entry.markers) expect(authority).toContain(marker);
    }
  });

  it("keeps TF-08 opt-in and applies the guard before initialization", () => {
    const source = read("test/storage-phase9-migration.integration-spec.ts");
    expect(source).toContain("process.env.STORAGE_MIGRATION_TESTS === 'true'");
    expect(source.indexOf("assertSafePersistenceTestEnvironment")).toBeLessThan(
      source.indexOf("await dataSource.initialize()"),
    );
  });

  it("guards TF-15 before the supported initialize path", () => {
    const source = read(
      "src/scripts/persistence-migration-verification-data-source.ts",
    );
    expect(source).toContain("class SafeMigrationVerificationDataSource");
    const initializeBody = source.slice(source.indexOf("override async initialize"));
    expect(initializeBody.indexOf("assertSafePersistenceTestEnvironment")).toBeLessThan(
      initializeBody.indexOf("super.initialize()"),
    );
  });

  it("does not select TEST from normal seed startup", () => {
    expect(read("src/database/seeds/seed.ts")).not.toContain(
      "SeedClassification.TEST",
    );
  });

  it("does not create any proposed business TEST group", () => {
    const runtime = sourceFiles(path.join(ROOT, "src"))
      .filter((file) => !file.endsWith(".spec.ts"))
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");
    for (const id of BUSINESS_TEST_GROUP_IDS) expect(runtime).not.toContain(id);
  });

  it("preserves the clean-v2 fixture payload boundary", () => {
    const source = read(
      "src/database/reconciliation/clean-v2-runtime-baseline.ts",
    );
    expect(source.match(/^\s*INSERT INTO\s+/gm)).toHaveLength(15);
    expect(source).toContain("products.addIfAbsent(USER_ID, PRODUCT_ID)");
    expect(source).toContain("'phase-one-category'");
    expect(source).toContain("$1, 1, 'Phase One Ad'");
  });
});
