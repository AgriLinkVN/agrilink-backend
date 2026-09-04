import { existsSync, readFileSync, readdirSync } from "fs";
import { join, relative } from "path";

import { ADMIN_SYSTEM_CONFIG_TEST_SEED_METADATA } from "../../modules/admin/infrastructure/database/seeds/system-config-test.seed";
import { ADS_PACKAGE_REFERENCE_SEED_METADATA } from "../../modules/ads/infrastructure/persistence/seeds/ad-package-reference.seed";
import { COOPERATIVES_DEV_MEMBERS_SEED_METADATA } from "../../modules/cooperatives/infrastructure/database/seeds/cooperative-member-development-seed.service";
import { GEOGRAPHY_PROVINCE_REFERENCE_SEED_METADATA } from "../../modules/geography/infrastructure/seeds/province-reference.seed";
import { PRODUCTS_CATEGORY_REFERENCE_SEED_METADATA } from "../../modules/products/infrastructure/database/seeds/product-category.seed";
import { PRODUCTS_DEV_SEED_METADATA } from "../../modules/products/infrastructure/database/seeds/product-development-seed.service";
import { PRODUCTS_TEST_SEED_METADATA } from "../../modules/products/infrastructure/database/seeds/product-test.seed";
import { PROFILES_ROLE_PROFILES_DEV_SEED_METADATA } from "../../modules/profiles/infrastructure/database/seeds/profile-role-development.seed";
import { REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_METADATA } from "../../modules/reviews/infrastructure/database/seeds/review-development-seed.service";
import { USERS_TEST_SEED_METADATA } from "../../modules/users/infrastructure/database/seeds/user-test.seed";
import { USERS_DEV_SEED_METADATA } from "../../modules/users/infrastructure/database/seeds/user.seed";
import { V2_MIGRATIONS, getMigrationNames } from "../migration-registry";
import {
  SeedClassification,
  SeedGroupMetadata,
} from "../seeds/framework/seed-contract";
import { orderSeedMetadata } from "../seeds/framework/seed-metadata";

interface ClosureGroup {
  readonly metadata: SeedGroupMetadata;
  readonly source: string;
  readonly writerSources: readonly string[];
  readonly tables: readonly string[];
}

const ROOT = process.cwd();
const GROUPS: readonly ClosureGroup[] = Object.freeze([
  group(
    ADS_PACKAGE_REFERENCE_SEED_METADATA,
    "src/modules/ads/infrastructure/persistence/seeds/ad-package-reference.seed.ts",
    ["ad_packages"],
  ),
  group(
    GEOGRAPHY_PROVINCE_REFERENCE_SEED_METADATA,
    "src/modules/geography/infrastructure/seeds/province-reference.seed.ts",
    ["provinces"],
  ),
  group(
    PRODUCTS_CATEGORY_REFERENCE_SEED_METADATA,
    "src/modules/products/infrastructure/database/seeds/product-category.seed.ts",
    ["product_categories"],
  ),
  group(
    USERS_DEV_SEED_METADATA,
    "src/modules/users/infrastructure/database/seeds/user.seed.ts",
    ["users"],
  ),
  group(
    COOPERATIVES_DEV_MEMBERS_SEED_METADATA,
    "src/modules/cooperatives/infrastructure/database/seeds/cooperative-member-development-seed.service.ts",
    ["cooperative_members"],
    [
      "src/modules/cooperatives/infrastructure/database/seeds/typeorm-cooperative-member-dev-seed.writer.ts",
    ],
  ),
  group(
    PRODUCTS_DEV_SEED_METADATA,
    "src/modules/products/infrastructure/database/seeds/product-development-seed.service.ts",
    ["products", "product_images", "product_certifications"],
    [
      "src/modules/products/infrastructure/database/seeds/typeorm-product-dev-seed.writer.ts",
    ],
  ),
  group(
    PROFILES_ROLE_PROFILES_DEV_SEED_METADATA,
    "src/modules/profiles/infrastructure/database/seeds/profile-role-development.seed.ts",
    [
      "farmer_profiles",
      "cooperative_profiles",
      "enterprise_profiles",
      "supplier_profiles",
    ],
    [
      "src/modules/profiles/infrastructure/database/seeds/typeorm-profile-role-development-seed.writer.ts",
    ],
  ),
  group(
    REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_METADATA,
    "src/modules/reviews/infrastructure/database/seeds/review-development-seed.service.ts",
    ["reviews"],
    [
      "src/modules/reviews/infrastructure/database/seeds/typeorm-review-dev-seed.writer.ts",
    ],
  ),
  group(
    USERS_TEST_SEED_METADATA,
    "src/modules/users/infrastructure/database/seeds/user-test.seed.ts",
    ["users"],
  ),
  group(
    PRODUCTS_TEST_SEED_METADATA,
    "src/modules/products/infrastructure/database/seeds/product-test.seed.ts",
    ["products"],
  ),
  group(
    ADMIN_SYSTEM_CONFIG_TEST_SEED_METADATA,
    "src/modules/admin/infrastructure/database/seeds/system-config-test.seed.ts",
    ["system_configs"],
  ),
]);

const MODULE_OWNERS = Object.freeze([
  "admin",
  "ads",
  "cooperatives",
  "geography",
  "products",
  "profiles",
  "reviews",
  "users",
]);

function group(
  metadata: SeedGroupMetadata,
  source: string,
  tables: readonly string[],
  writerSources: readonly string[] = [],
): ClosureGroup {
  return Object.freeze({
    metadata,
    source,
    tables: Object.freeze([...tables]),
    writerSources: Object.freeze([...writerSources]),
  });
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function collectTypeScriptSources(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptSources(path);
    return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
  });
}

describe("P8-10 final Phase 8 closure", () => {
  it("classifies every executable SeedGroup from current source", () => {
    const discovered = collectTypeScriptSources(join(ROOT, "src"))
      .filter((path) => !path.endsWith(".spec.ts"))
      .filter((path) => readFileSync(path, "utf8").includes("implements SeedGroup"))
      .map((path) => relative(ROOT, path).replace(/\\/g, "/"))
      .sort();

    expect(GROUPS).toHaveLength(11);
    expect(GROUPS.map(({ source }) => source).sort()).toEqual(discovered);
    expect(
      GROUPS.filter(
        ({ metadata }) =>
          metadata.classification === SeedClassification.REFERENCE,
      ),
    ).toHaveLength(3);
    expect(
      GROUPS.filter(
        ({ metadata }) => metadata.classification === SeedClassification.DEV,
      ),
    ).toHaveLength(5);
    expect(
      GROUPS.filter(
        ({ metadata }) => metadata.classification === SeedClassification.TEST,
      ),
    ).toHaveLength(3);
  });

  it("keeps exactly one bounded-context owner for every canonical table", () => {
    const ownersByTable = new Map<string, Set<string>>();
    for (const { metadata, tables } of GROUPS) {
      for (const table of tables) {
        const owners = ownersByTable.get(table) ?? new Set<string>();
        owners.add(metadata.owner);
        ownersByTable.set(table, owners);
      }
    }

    expect(ownersByTable.size).toBe(14);
    expect(
      [...ownersByTable.entries()].filter(([, owners]) => owners.size !== 1),
    ).toEqual([]);
  });

  it("keeps canonical seed persistence inside each owner", () => {
    for (const entry of GROUPS) {
      const source = [entry.source, ...entry.writerSources].map(read).join("\n");
      for (const foreignOwner of MODULE_OWNERS.filter(
        (owner) => owner !== entry.metadata.owner,
      )) {
        expect(source).not.toMatch(
          new RegExp(
            `${foreignOwner}/(?:infrastructure|entities|repositories)`,
          ),
        );
      }
      if (entry.metadata.dependencies.length === 0) {
        expect(source).not.toContain("context.dependencies.require");
      } else {
        expect(source).toContain("context.dependencies.requireString(");
      }
    }
  });

  it("keeps classification boundaries and the declared DAG closed", () => {
    const byId = new Map(
      GROUPS.map(({ metadata }) => [metadata.id, metadata]),
    );
    const missingDependencies = GROUPS.flatMap(({ metadata }) =>
      metadata.dependencies.filter((dependency) => !byId.has(dependency)),
    );
    expect(missingDependencies).toEqual([]);
    expect(new Set(GROUPS.map(({ metadata }) => metadata.id)).size).toBe(11);
    expect(() => orderSeedMetadata(GROUPS.map(({ metadata }) => metadata))).not.toThrow();

    for (const { metadata } of GROUPS) {
      for (const dependency of metadata.dependencies) {
        const provider = byId.get(dependency) as SeedGroupMetadata;
        if (metadata.classification === SeedClassification.TEST) {
          expect(provider.classification).not.toBe(SeedClassification.DEV);
        }
        if (metadata.classification === SeedClassification.DEV) {
          expect(provider.classification).not.toBe(SeedClassification.TEST);
        }
        if (metadata.classification === SeedClassification.REFERENCE) {
          expect(provider.classification).toBe(SeedClassification.REFERENCE);
        }
      }
    }
  });

  it("keeps TEST groups out of normal startup and the normal seed CLI", () => {
    for (const source of [read("src/main.ts"), read("src/database/seeds/seed.ts")]) {
      expect(source).not.toMatch(
        /createPhaseEightTestSeedGroups|createSharedTestIdentitySeedGroups|SeedClassification\.TEST/,
      );
    }
  });

  it("keeps central orchestration persistence-neutral and retired paths absent", () => {
    const orchestrator = read(
      "src/database/seeds/framework/seed-orchestrator.ts",
    );
    expect(orchestrator).not.toMatch(
      /getRepository|Repository|EntityManager|QueryRunner|@Entity/,
    );
    expect(orchestrator).not.toMatch(
      /\.query\(|\.save\(|\.insert\(|\.update\(|\.delete\(|resetAll|reset\s*\(/,
    );
    expect(existsSync(join(ROOT, "src/database/dev-seed.service.ts"))).toBe(
      false,
    );
    expect(
      existsSync(join(ROOT, "src/database/seeds/legacy-dev.seed-group.ts")),
    ).toBe(false);
    expect(read("src/main.ts")).not.toContain("legacy.dev.remaining");
    expect(read("src/database/seeds/seed.ts")).not.toContain(
      "legacy.dev.remaining",
    );
  });

  it("keeps synchronize disabled throughout canonical seed execution", () => {
    const executionSources = [
      "src/main.ts",
      "src/database/seeds/seed.ts",
      "src/database/data-source-options.ts",
      "src/database/seeds/framework/seed-orchestrator.ts",
      "src/database/seeds/test-seed-groups.registry.ts",
      "src/database/seeds/test-seed-output-executor.ts",
      ...GROUPS.flatMap(({ source, writerSources }) => [source, ...writerSources]),
    ];
    const source = [...new Set(executionSources)].map(read).join("\n");
    expect(source).not.toMatch(/synchronize\s*:\s*true|\.synchronize\s*\(/);
    expect(read("src/database/data-source-options.ts")).toContain(
      "synchronize: false",
    );
    const exceptions = JSON.parse(
      read("docs/architecture/persistence/exceptions.json"),
    ) as { exceptions: Array<{ id: string }> };
    expect(exceptions.exceptions.map(({ id }) => id)).not.toContain(
      "seed-synchronize",
    );
  });

  it("consumes merged P8-09 runtime and P8-09A schema evidence", () => {
    const runtime = read(
      "docs/architecture/persistence/phases/phase-08/disposable-postgres-runtime-proof.md",
    );
    for (const evidence of [
      "FIRST_RUN_EXECUTED_GROUP_COUNT=11",
      "SECOND_RUN_EXECUTED_GROUP_COUNT=11",
      "SECOND_RUN_MANAGED_TABLE_COUNT_DELTA=0",
      "UNSTABLE_RUNTIME_SEED_OUTPUT_COUNT=0",
      "DECLARED_FIXTURE_STATE_DRIFT_COUNT=0",
      "INTERRUPTED_RUN_RETRY_FINAL_STATE_MATCHES_FRESH_RUN=YES",
      "IDEMPOTENCY_VERIFIED=YES",
      "SECOND_SEED_RUN_NO_DUPLICATES=YES",
      "DISPOSABLE_DB_SEED_RUN_PASS=YES",
    ]) {
      expect(runtime).toContain(evidence);
    }

    const parity = read(
      "docs/architecture/persistence/phases/phase-08/canonical-schema-migration-parity.md",
    );
    for (const evidence of [
      "MISSING_CANONICAL_TABLE_COUNT_AFTER_FIX=0",
      "CANONICAL_SCHEMA_COLUMN_MISMATCH_COUNT_AFTER_FIX=0",
      "CANONICAL_SCHEMA_CONSTRAINT_MISMATCH_COUNT_AFTER_FIX=0",
    ]) {
      expect(parity).toContain(evidence);
    }
    expect(V2_MIGRATIONS).toHaveLength(6);
    expect(getMigrationNames(V2_MIGRATIONS).at(-1)).toBe(
      "RestoreCanonicalCooperativeMemberSchema1800000005000",
    );
  });

  it("keeps TEST target guards fail closed and request/DataSource bound", () => {
    const targetGuard = read(
      "src/database/reconciliation/database-target.guard.ts",
    );
    expect(targetGuard).toContain(
      'const TEST_HOST_ALLOWLIST = new Set(["localhost", "127.0.0.1", "::1"])',
    );
    expect(targetGuard).toContain('const PROTECTED_DATABASES = new Set(["agrilink_db"])');
    const seedGuard = read(
      "src/database/seeds/framework/seed-environment.guard.ts",
    );
    expect(seedGuard).toContain(
      "Database seed execution is disabled in production",
    );
    const executor = read("src/database/seeds/test-seed-output-executor.ts");
    expect(
      executor.lastIndexOf("assertDataSourceTargetMatchesRequest("),
    ).toBeLessThan(
      executor.indexOf("createSharedTestIdentitySeedGroups(dataSource)"),
    );
    expect(executor).toContain("TEST_DATASOURCE_TARGET_UNKNOWN");
    expect(executor).toContain("TEST_DATASOURCE_TARGET_MISMATCH");
  });

  it("records every Phase 8 exit criterion as satisfied", () => {
    const closure = read(
      "docs/architecture/persistence/phases/phase-08/final-closure.md",
    );
    for (const criterion of [
      "ALL_EXECUTABLE_SEEDERS_CLASSIFIED",
      "ALL_SEEDED_TABLES_HAVE_ONE_OWNER",
      "NO_CROSS_OWNER_SEED_REPOSITORY_ACCESS",
      "REFERENCE_DEV_TEST_SEEDS_SEPARATED",
      "DEPENDENCY_DAG_EXPLICIT",
      "IDEMPOTENCY_VERIFIED",
      "DISPOSABLE_DB_SEED_RUN_PASS",
      "SECOND_SEED_RUN_NO_DUPLICATES",
      "NO_PRODUCTION_DB_ACCESS",
      "NO_PROTECTED_LOCAL_DB_MUTATION",
      "CENTRAL_SEEDER_ORCHESTRATION_ONLY",
    ]) {
      expect(closure).toContain(`${criterion}=YES`);
    }
    expect(closure).toContain(
      "PHASE_08_EXIT_CRITERIA_STATUS=ALL_SATISFIED_PENDING_HUMAN_REVIEW",
    );
    expect(closure).toContain("PHASE_08_COMPLETE=YES_PENDING_HUMAN_REVIEW");
  });
});
