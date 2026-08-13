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
  const contractSource = readFileSync(
    join(__dirname, "seed-contract.ts"),
    "utf8",
  );
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

  it("guards startup seeding before application database bootstrap", () => {
    const guard = mainSource.indexOf("assertSeedExecutionSafety({");
    expect(guard).toBeGreaterThan(-1);
    expect(mainSource).toContain("parseEnvBoolean(");
    expect(guard).toBeLessThan(mainSource.indexOf("NestFactory.create"));
    expect(guard).toBeLessThan(mainSource.indexOf(".seedForDevelopment("));
    expect(guard).toBeLessThan(mainSource.indexOf(".seedAll("));
  });

  it("keeps seed contracts persistence-framework neutral", () => {
    expect(contractSource).not.toMatch(
      /from ["'](?:typeorm|@nestjs\/typeorm)["']/,
    );
    expect(contractSource).not.toMatch(/entities|repositories/i);
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
