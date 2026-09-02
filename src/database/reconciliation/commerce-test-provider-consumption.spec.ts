import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const TF04 = "test/commerce.e2e-spec.ts";
const TF05 =
  "test/persistence-phase-6/repository-concurrency.integration.spec.ts";

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

function count(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

function normalizedSha256(relative: string): string {
  return createHash("sha256")
    .update(read(relative).replace(/\r\n/g, "\n"))
    .digest("hex");
}

function insertStatements(source: string): readonly string[] {
  return [...source.matchAll(/`INSERT INTO[\s\S]*?`/g)].map(
    ([statement]) => statement,
  );
}

describe("P8-06D Commerce harness shared provider consumption", () => {
  const tf04 = read(TF04);
  const tf05 = read(TF05);

  it("removes only TF-04 shared seller and Rice persistence", () => {
    const inserts = insertStatements(tf04);

    expect(inserts).toHaveLength(1);
    expect(inserts.join("\n")).not.toContain("seller@example.test");
    expect(inserts.join("\n")).not.toContain("INSERT INTO products");
    expect(tf04).not.toContain("66666666-6666-4666-8666-666666666666");
    expect(tf04).not.toContain("22222222-2222-4222-8222-222222222222");
  });

  it("makes TF-04 consume both persisted IDs from SeedGroup outputs", () => {
    expect(tf04).toContain(
      "executeSharedTestIdentitySeedGroupsWithOutputs(dataSource",
    );
    expect(tf04).toContain("USERS_TEST_SEED_GROUP_ID");
    expect(tf04).toContain("USER_ID_BY_EMAIL_OUTPUT_KIND");
    expect(tf04).toContain("SHARED_SELLER_EMAIL");
    expect(tf04).toContain("PRODUCTS_TEST_SEED_GROUP_ID");
    expect(tf04).toContain("PRODUCT_ID_BY_SKU_OUTPUT_KIND");
    expect(tf04).toContain("SHARED_PRODUCT_SKU");
    expect(tf04).toContain("SELLER = sharedIdentities.sellerId");
    expect(tf04).toContain("PRODUCT = sharedIdentities.productId");
  });

  it("preserves the TF-04 fractional stub and assertion surface", () => {
    expect(tf04).toContain(
      "const FRACTIONAL_PRODUCT = '77777777-7777-4777-8777-777777777777'",
    );
    expect(tf04).toContain("if (id === FRACTIONAL_PRODUCT)");
    expect(tf04).toContain("throw new ProductCommercePriceIncompatibleError()");
    expect(count(tf04, /\bit\s*\(/g)).toBe(3);
    expect(count(tf04, /\bexpect\s*\(/g)).toBe(41);
  });

  it("removes only TF-05 shared seller and Rice persistence", () => {
    const inserts = insertStatements(tf05);

    expect(inserts).toHaveLength(1);
    expect(inserts.join("\n")).not.toContain("seller@example.test");
    expect(inserts.join("\n")).not.toContain("INSERT INTO products");
    expect(tf05).not.toContain("44444444-4444-4444-8444-444444444444");
    expect(tf05).not.toContain("22222222-2222-4222-8222-222222222222");
  });

  it("makes TF-05 consume both persisted IDs from SeedGroup outputs", () => {
    expect(tf05).toContain(
      "executeSharedTestIdentitySeedGroupsWithOutputs(dataSource",
    );
    expect(tf05).toContain("USERS_TEST_SEED_GROUP_ID");
    expect(tf05).toContain("USER_ID_BY_EMAIL_OUTPUT_KIND");
    expect(tf05).toContain("SHARED_SELLER_EMAIL");
    expect(tf05).toContain("PRODUCTS_TEST_SEED_GROUP_ID");
    expect(tf05).toContain("PRODUCT_ID_BY_SKU_OUTPUT_KIND");
    expect(tf05).toContain("SHARED_PRODUCT_SKU");
    expect(tf05).toContain("SELLER = sharedIdentities.sellerId");
    expect(tf05).toContain("PRODUCT = sharedIdentities.productId");
  });

  it("preserves TF-05 concurrency assertions and direct fixture boundary", () => {
    expect(count(tf05, /\bit\s*\(/g)).toBe(5);
    expect(count(tf05, /\bexpect\s*\(/g)).toBe(21);
    expect(count(tf05, /Promise\.all(?:Settled)?\s*\(/g)).toBe(6);
    expect(tf05).not.toContain("dataSource.transaction(");
    expect(tf05).toContain("await seedReferences(dataSource, database)");
  });

  it("keeps explicit disposable-target safety at both provider call sites", () => {
    for (const source of [tf04, tf05]) {
      expect(source).toContain("classification: SeedClassification.TEST");
      expect(source).toContain(
        "purpose: PersistenceTestPurpose.BUSINESS_FIXTURE",
      );
      expect(source).toContain("acknowledgement: database");
      expect(source).toContain("NODE_ENV: 'test', DB_NAME: database");
      expect(source).toContain("classifications: [SeedClassification.TEST]");
    }
  });

  it("keeps the output adapter TEST-only and out of normal registration", () => {
    const adapter = read("src/database/seeds/test-seed-output-executor.ts");
    const normalRuntime = read("src/main.ts") + read("src/app.module.ts");
    const normalCli = read("src/database/seeds/seed.ts");

    expect(adapter).toContain("assertSeedExecutionSafety(request)");
    expect(adapter).toContain("createSharedTestIdentitySeedGroups(dataSource)");
    expect(adapter).toContain("new SeedOutputRegistry()");
    expect(adapter).not.toContain(".initialize(");
    expect(adapter).not.toMatch(
      /seller@example\.test|TEST-COMMERCE-RICE-001|\bRice\b|[0-9a-f]{8}-[0-9a-f-]{27,}/i,
    );
    expect(normalRuntime + normalCli).not.toContain(
      "executeSharedTestIdentitySeedGroupsWithOutputs",
    );
    expect(normalCli).not.toContain("SeedClassification.TEST");
  });

  it("adds no cross-owner entity or repository lookup for output recovery", () => {
    for (const source of [tf04, tf05]) {
      expect(source).not.toMatch(
        /modules\/(?:users|products)\/infrastructure|user\.entity|product\.entity|typeorm-user\.repository|typeorm-product\.repository/,
      );
    }
  });

  it("preserves approved providers, clean-v2, and TF-08 byte-for-byte", () => {
    expect(
      normalizedSha256(
        "src/modules/users/infrastructure/database/seeds/user-test.seed.ts",
      ),
    ).toBe("48ba69c7af367b4a519befa341db47f2c7191a5a544fb30b275b776b374297a7");
    expect(
      normalizedSha256(
        "src/modules/products/infrastructure/database/seeds/product-test.seed.ts",
      ),
    ).toBe("70637f213e6a33068135f041696454ae0cfd2a7fc17cabeb9532029f844924a0");
    expect(
      normalizedSha256(
        "src/modules/admin/infrastructure/database/seeds/system-config-test.seed.ts",
      ),
    ).toBe("4953689d06323d963406e2b1d6bdc46d9d440694966626dd71a38f8dbfa2721c");
    expect(
      normalizedSha256(
        "src/database/reconciliation/clean-v2-runtime-baseline.ts",
      ),
    ).toBe("9642a46fb54532587fb512b233741f985c9674d4156866e22df8c0de0bd7378e");
    expect(
      normalizedSha256("src/database/seeds/framework/seed-orchestrator.ts"),
    ).toBe("4d5efb442b2ded18bb870c12fc4e4e5ab6d618c2c509f5236099d64ff598a701");
    expect(
      normalizedSha256("test/storage-phase9-migration.integration-spec.ts"),
    ).toBe("cb4870f2b4823efd1cb8e7928115187df91db509143142667b6073f00a485920");
  });

  it("keeps the TEST registry at exactly three groups with no new business ID", () => {
    const registry = read("src/database/seeds/test-seed-groups.registry.ts");
    const adapter = read("src/database/seeds/test-seed-output-executor.ts");
    const runtime = registry + adapter + tf04 + tf05;

    expect(registry).toContain("createSharedTestIdentitySeedGroups");
    expect(registry).toContain("createCleanV2OwnerTestSeedGroups");
    expect(registry).toContain("createPhaseEightTestSeedGroups");
    expect(runtime).not.toMatch(
      /commerce\.test\.operations|orders\.test\.orders|payments\.test\.payments|contracts\.test\.contracts/,
    );
    expect(adapter).not.toContain("SeedClassification.DEV");
  });
});
