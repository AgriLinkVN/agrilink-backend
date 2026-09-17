import { readFileSync } from "fs";
import { join } from "path";
import { adPackageReferenceSeedData } from "../../modules/ads/infrastructure/persistence/seeds/ad-package-reference.seed";
import { productCategoryReferenceSeedData } from "../../modules/products/infrastructure/database/seeds/product-category.seed";
import { CLEAN_V2_WRITE_INVENTORY } from "./clean-v2-write-inventory";

const ROOT = process.cwd();
const cleanV2Path = join(
  ROOT,
  "src/database/reconciliation/clean-v2-runtime-baseline.ts",
);

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

describe("P8-06C clean-v2 owner provider split", () => {
  it("classifies every prerequisite, workflow action, and harness control", () => {
    expect(CLEAN_V2_WRITE_INVENTORY).toHaveLength(26);
    expect(new Set(CLEAN_V2_WRITE_INVENTORY.map(({ id }) => id)).size).toBe(26);
    expect(
      CLEAN_V2_WRITE_INVENTORY.filter(
        ({ prerequisiteFixture }) => prerequisiteFixture,
      ),
    ).toHaveLength(15);
    expect(
      CLEAN_V2_WRITE_INVENTORY.filter(({ workflowAction }) => workflowAction),
    ).toHaveLength(2);
    expect(
      CLEAN_V2_WRITE_INVENTORY.filter(
        ({ migrationOrParityControl }) => migrationOrParityControl,
      ),
    ).toHaveLength(9);
    expect(
      CLEAN_V2_WRITE_INVENTORY.every(({ reason }) => reason.length > 20),
    ).toBe(true);
  });

  it("maps all nine control entries to current migration/parity source", () => {
    const source = read("src/scripts/persistence-verify-clean-v2.ts");
    const controls = CLEAN_V2_WRITE_INVENTORY.filter(
      ({ migrationOrParityControl }) => migrationOrParityControl,
    );

    expect(controls.map(({ id }) => id)).toEqual([
      "CV2-C01",
      "CV2-C02",
      "CV2-C03",
      "CV2-C04",
      "CV2-C05",
      "CV2-C06",
      "CV2-C07",
      "CV2-C08",
      "CV2-C09",
    ]);
    expect(source.match(/target\.runMigrations\(\)/g)).toHaveLength(3);
    expect(source).toContain("createDisposableDatabase(admin, testTarget)");
    expect(source).toContain("target.undoLastMigration()");
    expect(source).toContain("verifyOrWriteRuntimeBaselines(");
    expect(source).toContain('DROP TABLE "public"."migrations_v2"');
    expect(source).toContain("applyExistingSchemaOnboarding(");
    expect(source).toContain("dropDisposableDatabase(admin, testTarget)");
  });

  it("moves only the independently keyed Admin system config", () => {
    const moved = CLEAN_V2_WRITE_INVENTORY.filter(
      ({ currentDisposition }) =>
        currentDisposition === "MOVE_TO_OWNER_LOCAL_TEST_PROVIDER",
    );
    expect(moved).toEqual([
      expect.objectContaining({
        id: "CV2-F13",
        table: "system_configs",
        owner: "admin",
        stableIdentityProven: true,
        mechanism: "OWNER_TEST_SEED_GROUP_RECONCILIATION",
      }),
    ]);
  });

  it("retains exactly fourteen justified raw SQL prerequisite writes", () => {
    const source = readFileSync(cleanV2Path, "utf8");
    const rawTables = [...source.matchAll(/INSERT INTO\s+([a-z_]+)/g)].map(
      ([, table]) => table,
    );
    const expected = CLEAN_V2_WRITE_INVENTORY.filter(
      ({ mechanism }) => mechanism === "RAW_SQL_INSERT",
    ).map(({ table }) => table);

    expect(rawTables).toEqual(expected);
    expect(rawTables).toHaveLength(14);
    expect(rawTables).not.toContain("system_configs");
    expect(source).toContain(
      "(SELECT id FROM system_configs WHERE key = 'phase1')",
    );
  });

  it("preserves Phase One category and Product payload without injecting SKU", () => {
    const source = readFileSync(cleanV2Path, "utf8");

    expect(source).toContain("'Phase One Category', 'phase-one-category'");
    expect(source).toContain("'Phase One Product'");
    expect(source).toContain("20000000-0000-4000-8000-000000000001");
    expect(source).not.toContain("TEST-CLEANV2-PHASE-ONE-001");
    expect(
      productCategoryReferenceSeedData.some(
        ({ slug }) => slug === "phase-one-category",
      ),
    ).toBe(false);
  });

  it("keeps synthetic Geography and Ads reference shapes harness-local", () => {
    const source = readFileSync(cleanV2Path, "utf8");

    expect(source).toContain("'Phase One Province', 'P1'");
    expect(source).toContain("'Phase One District', 'D1'");
    expect(source).toContain("'Phase One Package', 'banner', 7, 100");
    expect(
      adPackageReferenceSeedData.some(
        ({ name }) => name === "Phase One Package",
      ),
    ).toBe(false);
  });

  it("preserves the Wishlist concurrency workflow outside TEST providers", () => {
    const source = readFileSync(cleanV2Path, "utf8");
    const adminProvider = read(
      "src/modules/admin/infrastructure/database/seeds/system-config-test.seed.ts",
    );
    const productProvider = read(
      "src/modules/products/infrastructure/database/seeds/product-test.seed.ts",
    );

    expect(
      source.match(/products\.addIfAbsent\(USER_ID, PRODUCT_ID\)/g),
    ).toHaveLength(2);
    expect(source).toContain(
      "wishlistWrites.length === 2 && wishlistCount === 1",
    );
    expect(adminProvider + productProvider).not.toMatch(/wishlist/i);
  });

  it("classifies the Product detail view-count write as a local workflow action", () => {
    const source = readFileSync(cleanV2Path, "utf8");
    const productRepository = read(
      "src/modules/products/infrastructure/repositories/typeorm-product.repository.ts",
    );

    expect(
      CLEAN_V2_WRITE_INVENTORY.filter(({ workflowAction }) => workflowAction),
    ).toEqual([
      expect.objectContaining({ id: "CV2-W01", table: "wishlists" }),
      expect.objectContaining({
        id: "CV2-W02",
        table: "products",
        mechanism: "OWNER_REPOSITORY_VIEW_COUNT_INCREMENT",
        currentDisposition: "KEEP_HARNESS_LOCAL_WORKFLOW_ACTION",
      }),
    ]);
    expect(source).toContain("() => products.findOne(PRODUCT_ID)");
    expect(source).toContain(
      "Product detail intentionally increments its view counter asynchronously.",
    );
    expect(productRepository).toContain(
      ".increment({ id }, 'viewCount', 1)",
    );
  });

  it("executes the owner provider explicitly inside the guarded fixture boundary", () => {
    const source = readFileSync(cleanV2Path, "utf8");

    expect(source).toContain("new SeedOrchestrator(");
    expect(source).toContain("createCleanV2OwnerTestSeedGroups(manager)");
    expect(source).toContain("classifications: [SeedClassification.TEST]");
    expect(source.indexOf("dataSource.transaction")).toBeLessThan(
      source.indexOf("createCleanV2OwnerTestSeedGroups(manager)"),
    );
  });

  it("keeps normal startup and DEV/REFERENCE CLI free of TEST registration", () => {
    const normalRuntime = read("src/main.ts") + read("src/app.module.ts");
    const cli = read("src/database/seeds/seed.ts");

    expect(normalRuntime + cli).not.toMatch(
      /createCleanV2OwnerTestSeedGroups|admin\.test\.system-configs/,
    );
    expect(cli).not.toContain("SeedClassification.TEST");
  });

  it("keeps the P8-06A target guard immediately before runtime capture", () => {
    const source = read("src/scripts/persistence-verify-clean-v2.ts");
    const guardCall = source.lastIndexOf(
      "assertSafePersistenceTestEnvironment({",
    );
    const captureCall = source.lastIndexOf(
      "captureRuntimeBaseline(target)",
    );

    expect(guardCall).toBeGreaterThan(-1);
    expect(captureCall).toBeGreaterThan(guardCall);
    expect(source.slice(guardCall, captureCall)).toContain(
      "operation: PersistenceTestOperation.FIXTURE_WRITE",
    );
  });

  it("adds no cross-owner repository or entity imports to the Admin provider", () => {
    const provider = read(
      "src/modules/admin/infrastructure/database/seeds/system-config-test.seed.ts",
    );
    const imports = [...provider.matchAll(/^import[\s\S]*?from\s+["']([^"']+)["'];$/gm)].map(
      ([, path]) => path,
    );

    expect(imports).toEqual([
      "typeorm",
      "../../../../../database/seeds/framework/seed-contract",
      "../../../entities/system-config.entity",
    ]);
    expect(provider).not.toMatch(/modules\/(?!admin)|getRepository\([^S]/);
  });

  it("preserves every runtime smoke assertion and OpenAPI capture purpose", () => {
    const source = readFileSync(cleanV2Path, "utf8");
    const baseline = JSON.parse(
      read(
        "docs/architecture/persistence/baselines/clean-v2-runtime-baseline.json",
      ),
    ) as { smoke: Record<string, boolean> };

    expect(Object.keys(baseline.smoke)).toHaveLength(16);
    for (const key of Object.keys(baseline.smoke)) {
      expect(source).toContain(`${key}:`);
    }
    expect(source).toContain("export async function captureOpenApiBaseline(");
    expect(source).toContain("SwaggerModule.createDocument(app, config)");
  });
});
