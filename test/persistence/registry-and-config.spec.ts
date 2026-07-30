import * as fs from "fs";
import * as path from "path";

import { parseDatabaseEnvironment } from "../../src/config/database-environment";
import { parseEnvBoolean } from "../../src/config/parse-env-boolean";
import { createDataSourceOptions } from "../../src/database/data-source-options";
import {
  CANONICAL_BASELINE_ENTITY_REGISTRY,
  CANONICAL_BASELINE_TABLE_KEYS,
  CLI_ENTITY_REGISTRY,
  EXCLUDED_RUNTIME_TABLE_KEYS,
  getEntityTableKey,
  getRegisteredEntityKeys,
  RUNTIME_ENTITY_ENTRIES,
  RUNTIME_ENTITY_REGISTRY,
  TEST_ENTITY_REGISTRY,
} from "../../src/database/entity-registry";
import {
  assertDeterministicMigrationRegistry,
  getMigrationNames,
  LEGACY_MIGRATIONS,
  V2_MIGRATIONS,
} from "../../src/database/migration-registry";
import { CANONICAL_BASELINE_V2_TABLES } from "../../src/database/migrations-v2/1800000000000-CreateCanonicalBaselineV2";
import { assertDisposableDatabaseTarget } from "../../src/database/reconciliation/database-target.guard";

describe("Persistence Phase 1 registry and configuration", () => {
  it.each([
    [undefined, false],
    ["", false],
    ["false", false],
    ["0", false],
    ["no", false],
    ["off", false],
    ["true", true],
    ["1", true],
    ["yes", true],
    ["on", true],
    [false, false],
    [true, true],
  ])("strictly parses %p as %p", (value, expected) => {
    expect(parseEnvBoolean(value, "FLAG")).toBe(expected);
  });

  it("rejects invalid booleans and unsafe production flags", () => {
    expect(() => parseEnvBoolean("truthy", "FLAG")).toThrow(
      "FLAG must be one of",
    );
    expect(() =>
      parseDatabaseEnvironment({
        NODE_ENV: "production",
        DB_SYNCHRONIZE: "true",
      }),
    ).toThrow("DB_SYNCHRONIZE must be false in production.");
    expect(() =>
      parseDatabaseEnvironment({
        NODE_ENV: "production",
        PRODUCT_DEV_SEED: "true",
      }),
    ).toThrow("Development seed flags must be false in production.");
  });

  it("never enables synchronize and does not expose secrets in target logs", () => {
    const options = createDataSourceOptions(
      {
        DB_HOST: "localhost",
        DB_PORT: "5433",
        DB_NAME: "phase_1_test",
        DB_USER: "phase_1_user",
        DB_PASS: "do-not-log",
        DB_SYNCHRONIZE: "false",
      },
      { entities: RUNTIME_ENTITY_REGISTRY },
    );
    expect(options.synchronize).toBe(false);
    expect(JSON.stringify({ database: options.database })).not.toContain(
      "do-not-log",
    );
  });

  it("protects agrilink_db and only allows named disposable targets", () => {
    expect(() => assertDisposableDatabaseTarget("agrilink_db")).toThrow(
      "protected database",
    );
    expect(() => assertDisposableDatabaseTarget("random_test")).toThrow(
      "must start with",
    );
    expect(() =>
      assertDisposableDatabaseTarget("agrilink_schema_parity_abc123"),
    ).not.toThrow();
  });

  it("uses one deterministic runtime/CLI/test registry", () => {
    expect(RUNTIME_ENTITY_REGISTRY).toBe(CLI_ENTITY_REGISTRY);
    expect(RUNTIME_ENTITY_REGISTRY).toBe(TEST_ENTITY_REGISTRY);
    expect(RUNTIME_ENTITY_REGISTRY).toHaveLength(33);
    expect(new Set(RUNTIME_ENTITY_REGISTRY).size).toBe(33);
    expect(getRegisteredEntityKeys()).toHaveLength(33);
    expect(new Set(getRegisteredEntityKeys()).size).toBe(33);
    expect(
      RUNTIME_ENTITY_ENTRIES.map(({ entity }) => getEntityTableKey(entity)),
    ).toEqual(RUNTIME_ENTITY_ENTRIES.map(({ key }) => key));
  });

  it("keeps the reviewed 26-table baseline separate from seven runtime extras", () => {
    expect(CANONICAL_BASELINE_ENTITY_REGISTRY).toHaveLength(26);
    expect(CANONICAL_BASELINE_TABLE_KEYS).toHaveLength(26);
    expect(EXCLUDED_RUNTIME_TABLE_KEYS).toHaveLength(7);

    const matrixPath = path.join(
      process.cwd(),
      "docs/architecture/persistence/discovery/baseline-inclusion-matrix.json",
    );
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as {
      entries: Array<{
        schema: string;
        table: string;
        includeInBaselineV2: boolean;
      }>;
    };
    const reviewed = matrix.entries
      .filter(({ includeInBaselineV2 }) => includeInBaselineV2)
      .map(({ schema, table }) => `${schema}.${table}`)
      .sort();
    expect(CANONICAL_BASELINE_TABLE_KEYS).toEqual(reviewed);
    expect([...CANONICAL_BASELINE_V2_TABLES].sort()).toEqual(
      reviewed.map((key) => key.replace("public.", "")),
    );
  });

  it("uses explicit, ordered migration registries without test files", () => {
    expect(LEGACY_MIGRATIONS).toHaveLength(11);
    expect(V2_MIGRATIONS).toHaveLength(1);
    expect(() => assertDeterministicMigrationRegistry()).not.toThrow();
    const names = [
      ...getMigrationNames(LEGACY_MIGRATIONS),
      ...getMigrationNames(V2_MIGRATIONS),
    ];
    expect(new Set(names).size).toBe(names.length);
    expect(names.some((name) => /spec/i.test(name))).toBe(false);
  });
});
