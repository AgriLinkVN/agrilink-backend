import { readFileSync } from "fs";
import { join } from "path";

describe("legacy seed entrypoint safety regressions", () => {
  const adminSource = readFileSync(
    join(__dirname, "..", "admin-dev.seed.ts"),
    "utf8",
  );
  const cliSource = readFileSync(join(__dirname, "..", "seed.ts"), "utf8");
  const mainSource = readFileSync(
    join(__dirname, "..", "..", "..", "main.ts"),
    "utf8",
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

  it("does not let the admin development seed default to agrilink_db", () => {
    expect(adminSource).not.toMatch(/DB_NAME\s*\?\?\s*["']agrilink_db["']/);
    expect(adminSource).not.toMatch(/DB_(?:HOST|PORT|NAME|USER|PASS)\s*\?\?/);
    expect(adminSource).toContain("parseDatabaseEnvironment(process.env)");
  });

  it("guards the admin seed before DataSource construction or initialization", () => {
    const guard = adminSource.lastIndexOf("assertSeedExecutionSafety({");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(
      adminSource.indexOf("const ds = new DataSource"),
    );
    expect(guard).toBeLessThan(adminSource.indexOf("ds.initialize()"));
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
    expect(guard).toBeLessThan(mainSource.indexOf(".seedAll("));
  });

  it("runs one canonical Product DEV group and skips central Product writes", () => {
    expect(
      mainSource.match(/app\.get\(ProductDevelopmentSeedService\)/g),
    ).toHaveLength(1);
    expect(mainSource).toContain("createProductsCategoryReferenceSeedGroup");
    expect(mainSource).toContain("createUsersDevSeedGroup");
    expect(mainSource).toContain("skipProducts: true");
    expect(mainSource).not.toContain("seedForDevelopment(");
    expect(cliSource).not.toContain("ProductDevelopmentSeedService");
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
});
