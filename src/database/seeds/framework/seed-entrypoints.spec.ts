import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { ADS_PACKAGE_REFERENCE_SEED_METADATA } from "../../../modules/ads/infrastructure/persistence/seeds/ad-package-reference.seed";
import { COOPERATIVES_DEV_MEMBERS_SEED_METADATA } from "../../../modules/cooperatives/infrastructure/database/seeds/cooperative-member-development-seed.service";
import { GEOGRAPHY_PROVINCE_REFERENCE_SEED_METADATA } from "../../../modules/geography/infrastructure/seeds/province-reference.seed";
import { PRODUCTS_CATEGORY_REFERENCE_SEED_METADATA } from "../../../modules/products/infrastructure/database/seeds/product-category.seed";
import { PRODUCTS_DEV_SEED_METADATA } from "../../../modules/products/infrastructure/database/seeds/product-development-seed.service";
import { PROFILES_ROLE_PROFILES_DEV_SEED_METADATA } from "../../../modules/profiles/infrastructure/database/seeds/profile-role-development.seed";
import { REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_METADATA } from "../../../modules/reviews/infrastructure/database/seeds/review-development-seed.service";
import { USERS_DEV_SEED_METADATA } from "../../../modules/users/infrastructure/database/seeds/user.seed";
import { orderSeedMetadata } from "./seed-metadata";

function collectTypeScriptSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTypeScriptSources(path);
    }
    return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
  });
}

describe("seed entrypoint safety and retirement regressions", () => {
  const repositoryRoot = join(__dirname, "..", "..", "..", "..");
  const sourceRoot = join(repositoryRoot, "src");
  const adminSourcePath = join(
    sourceRoot,
    "database",
    "seeds",
    "admin-dev.seed.ts",
  );
  const cliSource = readFileSync(join(__dirname, "..", "seed.ts"), "utf8");
  const mainSource = readFileSync(
    join(__dirname, "..", "..", "..", "main.ts"),
    "utf8",
  );
  const centralSourcePath = join(__dirname, "..", "..", "dev-seed.service.ts");
  const legacyRemainingSourcePath = join(
    __dirname,
    "..",
    "legacy-remaining-dev-seed.group.ts",
  );
  const appModuleSource = readFileSync(
    join(__dirname, "..", "..", "..", "app.module.ts"),
    "utf8",
  );
  const packageSource = readFileSync(
    join(repositoryRoot, "package.json"),
    "utf8",
  );
  const phaseDocuments = [
    "README.md",
    "admin-dev-seed-decisions.md",
    "admin-dev-product-decisions.md",
    "dev-seed-service-decomposition.md",
    "seed-inventory.md",
  ].map((file) =>
    readFileSync(
      join(
        repositoryRoot,
        "docs",
        "architecture",
        "persistence",
        "phases",
        "phase-08",
        file,
      ),
      "utf8",
    ),
  );
  const centralRetirementDocuments = [
    "README.md",
    "dev-seed-c3-decisions.md",
    "dev-seed-service-decomposition.md",
    "seed-inventory.md",
  ].map((file) =>
    readFileSync(
      join(
        repositoryRoot,
        "docs",
        "architecture",
        "persistence",
        "phases",
        "phase-08",
        file,
      ),
      "utf8",
    ),
  );
  const frameworkContractSource = [
    "seed-contract.ts",
    "seed-dependency-outputs.ts",
    "seed-environment.guard.ts",
    "seed-metadata.ts",
    "seed-orchestrator.ts",
  ]
    .map((file) => readFileSync(join(__dirname, file), "utf8"))
    .join("\n");
  const orchestratorSource = readFileSync(
    join(__dirname, "seed-orchestrator.ts"),
    "utf8",
  );
  const reviewsSeedSource = readFileSync(
    join(
      __dirname,
      "..",
      "..",
      "..",
      "modules",
      "reviews",
      "infrastructure",
      "database",
      "seeds",
      "review-development-seed.service.ts",
    ),
    "utf8",
  );
  const cooperativeMembersSeedSource = readFileSync(
    join(
      __dirname,
      "..",
      "..",
      "..",
      "modules",
      "cooperatives",
      "infrastructure",
      "database",
      "seeds",
      "cooperative-member-development-seed.service.ts",
    ),
    "utf8",
  );

  it("keeps the retired standalone Admin DEV entrypoint unreachable", () => {
    expect(existsSync(adminSourcePath)).toBe(false);

    const staleRuntimeSources = collectTypeScriptSources(sourceRoot)
      .filter((path) => !path.endsWith(".spec.ts"))
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        return (
          source.includes("admin-dev.seed") ||
          source.includes("executeAdminDevOwnerGroups") ||
          source.includes("seedAdminDevData")
        );
      });

    expect(staleRuntimeSources).toEqual([]);
    expect(packageSource).not.toContain("admin-dev.seed");
    expect(cliSource).not.toContain("admin-dev.seed");
    expect(mainSource).not.toContain("admin-dev.seed");
  });

  it("guards the central CLI before DataSource construction", () => {
    const guard = cliSource.indexOf("assertSeedExecutionSafety({");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(cliSource.indexOf("new DataSource"));
  });

  it("delegates Users DEV persistence through explicit owner-group selection", () => {
    expect(cliSource).toContain("createUsersDevSeedGroup(AppDataSource)");
    expect(cliSource).toContain("SeedClassification.REFERENCE");
    expect(cliSource).toContain("SeedClassification.DEV");
    expect(cliSource).not.toMatch(/\bseedUsers\s*\(/);
  });

  it("guards startup seeding before application database bootstrap", () => {
    const guard = mainSource.indexOf("assertSeedExecutionSafety({");
    expect(guard).toBeGreaterThan(-1);
    expect(mainSource).toContain("parseEnvBoolean(");
    expect(guard).toBeLessThan(mainSource.indexOf("NestFactory.create"));
    expect(guard).toBeLessThan(
      mainSource.indexOf("const seedOrchestrator = new SeedOrchestrator"),
    );
    expect(mainSource).not.toContain(".seedAll(");
  });

  it("runs canonical owner groups without central continuation scaffolding", () => {
    expect(
      mainSource.match(/app\.get\(ProductDevelopmentSeedService\)/g),
    ).toHaveLength(1);
    expect(
      mainSource.match(/app\.get\(ReviewDevelopmentSeedService\)/g),
    ).toHaveLength(1);
    expect(
      mainSource.match(/app\.get\(CooperativeMemberDevelopmentSeedService\)/g),
    ).toHaveLength(1);
    expect(mainSource).toContain("createProductsCategoryReferenceSeedGroup");
    expect(mainSource).toContain("createUsersDevSeedGroup");
    expect(mainSource).toContain("createProfilesRoleProfilesDevSeedGroup");
    expect(existsSync(centralSourcePath)).toBe(false);
    expect(existsSync(legacyRemainingSourcePath)).toBe(false);
    expect(mainSource).not.toMatch(
      /DevSeedService|LegacyRemainingDevSeedGroup|legacy\.dev\.remaining|seedRemainingLegacySections/,
    );
    expect(appModuleSource).not.toMatch(/DevSeedService|dev-seed\.service/);
    expect(mainSource).not.toContain("devSeed.seedAll");
    expect(mainSource).not.toContain("seedForDevelopment(");
    expect(cliSource).not.toContain("ProductDevelopmentSeedService");
    expect(reviewsSeedSource).toContain(
      "dependencies: [USERS_DEV_SEED_GROUP_ID, PRODUCTS_DEV_SEED_GROUP_ID]",
    );
    expect(cooperativeMembersSeedSource).toContain(
      "dependencies: [USERS_DEV_SEED_GROUP_ID]",
    );
    expect(mainSource).not.toMatch(
      /cooperatives\.dev\.(?:bulk-operations|harvest)/,
    );
  });

  it("keeps the canonical owner-local metadata inventory complete and acyclic", () => {
    const metadata = [
      ADS_PACKAGE_REFERENCE_SEED_METADATA,
      COOPERATIVES_DEV_MEMBERS_SEED_METADATA,
      GEOGRAPHY_PROVINCE_REFERENCE_SEED_METADATA,
      PRODUCTS_CATEGORY_REFERENCE_SEED_METADATA,
      PRODUCTS_DEV_SEED_METADATA,
      PROFILES_ROLE_PROFILES_DEV_SEED_METADATA,
      REVIEWS_DEV_PRODUCT_FEEDBACK_SEED_METADATA,
      USERS_DEV_SEED_METADATA,
    ];

    expect(metadata).toHaveLength(8);
    expect(new Set(metadata.map(({ id }) => id)).size).toBe(8);
    expect(orderSeedMetadata(metadata).map(({ id }) => id)).toEqual([
      "ads.reference.packages",
      "geography.reference.provinces",
      "products.reference.categories",
      "users.dev.users",
      "cooperatives.dev.members",
      "products.dev.products",
      "profiles.dev.role-profiles",
      "reviews.dev.product-feedback",
    ]);
    expect(metadata.map(({ id }) => id)).not.toContain("legacy.dev.remaining");
  });

  it("retires destructive Product reset before application bootstrap", () => {
    const resetFailure = mainSource.indexOf(
      "PRODUCT_DEV_SEED_RESET is retired",
    );
    expect(resetFailure).toBeGreaterThan(-1);
    expect(resetFailure).toBeLessThan(mainSource.indexOf("NestFactory.create"));
  });

  it("keeps seed framework contracts persistence-framework neutral", () => {
    expect(frameworkContractSource).not.toMatch(
      /from ["'](?:typeorm|@nestjs\/typeorm)["']/,
    );
    expect(frameworkContractSource).not.toMatch(
      /\b(?:DataSource|EntityManager|QueryRunner|Repository)\b/,
    );
    expect(frameworkContractSource).not.toMatch(
      /modules\/.*\/(?:entities|repositories)\//,
    );
  });

  it("keeps the new orchestrator free of business persistence writes", () => {
    expect(orchestratorSource).not.toMatch(
      /getRepository|EntityManager|QueryRunner/,
    );
    expect(orchestratorSource).not.toMatch(
      /\.query\(|\.save\(|\.insert\(|\.update\(|\.delete\(/,
    );
    expect(orchestratorSource).not.toMatch(
      /modules\/(?:products|users|geography)/,
    );
  });

  it("records the D4 retirement without closing central or schema debt", () => {
    for (const document of phaseDocuments) {
      expect(document).toContain(
        "P8_05D4_STANDALONE_ENTRYPOINT_RETIREMENT_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW",
      );
      expect(document).toContain(
        "P8_05D_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW",
      );
      expect(document).toContain("P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO");
      expect(document).toContain("SCHEMA_CHANGES=0");
      expect(document).toContain("MIGRATIONS_CREATED=0");
    }
  });

  it("records C4D retirement as pending review without closing Phase 8", () => {
    for (const document of centralRetirementDocuments) {
      expect(document).toContain(
        "P8_05C3C4_IMPLEMENTATION_STATUS=IMPLEMENTED_BY_MERGED_PR_142",
      );
      expect(document).toContain(
        "P8_05C4D_IMPLEMENTATION_STATUS=IMPLEMENTED_PENDING_HUMAN_REVIEW",
      );
      expect(document).toContain("CENTRAL_DEVSEEDSERVICE_RETIRED=YES");
      expect(document).toContain("LEGACY_DEV_REMAINING_EXISTS=NO");
      expect(document).toContain("CENTRAL_PERSISTENCE_CAPABLE_METHOD_COUNT=0");
      expect(document).toContain("IDEMPOTENCY_VERIFIED=NOT_YET_VERIFIED");
      expect(document).toContain("PHASE_08_COMPLETE=NO");
    }
  });
});
