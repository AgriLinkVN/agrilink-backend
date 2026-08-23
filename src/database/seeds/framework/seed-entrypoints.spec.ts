import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

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
  const centralSource = readFileSync(
    join(__dirname, "..", "..", "dev-seed.service.ts"),
    "utf8",
  );
  const legacyRemainingSource = readFileSync(
    join(__dirname, "..", "legacy-remaining-dev-seed.group.ts"),
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
    expect(guard).toBeLessThan(
      mainSource.indexOf("new LegacyRemainingDevSeedGroup"),
    );
    expect(mainSource).not.toContain(".seedAll(");
  });

  it("runs canonical owner groups and the central continuation in one DAG", () => {
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
    expect(mainSource).toContain("new LegacyRemainingDevSeedGroup");
    expect(legacyRemainingSource).toContain(
      'LEGACY_REMAINING_DEV_SEED_GROUP_ID = "legacy.dev.remaining"',
    );
    expect(legacyRemainingSource).toContain(
      "id: LEGACY_REMAINING_DEV_SEED_GROUP_ID",
    );
    expect(centralSource).toContain("async resetAll(");
    expect(centralSource).toContain("async seedForum(");
    expect(centralSource).toContain("async seedAdPackages(");
    expect(centralSource).toContain("async seedAdCampaigns(");
    expect(centralSource).toContain("async seedBulkListings(");
    expect(centralSource).toContain("async seedHarvestSchedules(");
    expect(centralSource).not.toContain("skipProducts: true");
    expect(centralSource).toContain("products.XOAI_HOA_LOC");
    expect(centralSource).not.toMatch(
      /seedReviews|getRepository\(Review\)|review\.entity/,
    );
    expect(centralSource).not.toMatch(
      /getRepository\(Product\)|products\[|productIds\[/,
    );
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
      expect(document).toContain(
        "P8_05C4D_CENTRAL_RETIREMENT_AUTHORIZED=NO",
      );
      expect(document).toContain("SCHEMA_CHANGES=0");
      expect(document).toContain("MIGRATIONS_CREATED=0");
    }
  });
});
