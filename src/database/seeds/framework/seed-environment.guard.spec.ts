import { SeedClassification } from "./seed-contract";
import { assertSeedExecutionSafety } from "./seed-environment.guard";

const SAFE_DEV_DATABASE = "agrilink_persistence_test_seed_guard_dev";
const SAFE_TEST_DATABASE = "agrilink_persistence_test_seed_guard_test";

function request(
  nodeEnv: string,
  databaseName: string | undefined,
  classifications: readonly SeedClassification[],
) {
  return {
    environment: {
      NODE_ENV: nodeEnv,
      DB_NAME: databaseName,
    },
    classifications,
  };
}

describe("seed execution environment safety", () => {
  it("rejects production even when the database name is disposable", () => {
    expect(() =>
      assertSeedExecutionSafety(
        request("production", SAFE_TEST_DATABASE, [SeedClassification.TEST]),
      ),
    ).toThrow("Database seed execution is disabled in production");
  });

  it.each(["development", "test"])(
    "rejects protected agrilink_db in %s",
    (nodeEnv) => {
      const classification =
        nodeEnv === "test" ? SeedClassification.TEST : SeedClassification.DEV;
      expect(() =>
        assertSeedExecutionSafety(
          request(nodeEnv, "agrilink_db", [classification]),
        ),
      ).toThrow("Refusing to use protected database agrilink_db");
    },
  );

  it("rejects missing explicit database target configuration", () => {
    expect(() =>
      assertSeedExecutionSafety(
        request("development", undefined, [SeedClassification.DEV]),
      ),
    ).toThrow("Explicit DB_NAME or DATABASE_URL is required");
  });

  it("accepts an explicit disposable development target for DEV seeds", () => {
    expect(
      assertSeedExecutionSafety(
        request("development", SAFE_DEV_DATABASE, [SeedClassification.DEV]),
      ),
    ).toEqual({
      nodeEnv: "development",
      databaseName: SAFE_DEV_DATABASE,
      classifications: [SeedClassification.DEV],
    });
  });

  it("accepts an explicit disposable test target for TEST seeds", () => {
    expect(
      assertSeedExecutionSafety(
        request("test", SAFE_TEST_DATABASE, [SeedClassification.TEST]),
      ),
    ).toEqual({
      nodeEnv: "test",
      databaseName: SAFE_TEST_DATABASE,
      classifications: [SeedClassification.TEST],
    });
  });

  it("rejects DEV seed selection for a TEST target", () => {
    expect(() =>
      assertSeedExecutionSafety(
        request("test", SAFE_TEST_DATABASE, [SeedClassification.DEV]),
      ),
    ).toThrow("DEV seeds are only allowed in the development environment");
  });

  it("rejects TEST seed selection for a DEV target", () => {
    expect(() =>
      assertSeedExecutionSafety(
        request("development", SAFE_DEV_DATABASE, [SeedClassification.TEST]),
      ),
    ).toThrow("TEST seeds are only allowed in the test environment");
  });

  it.each(["development", "test"])(
    "allows REFERENCE only when it is explicitly selected in %s",
    (nodeEnv) => {
      const target = assertSeedExecutionSafety(
        request(nodeEnv, SAFE_TEST_DATABASE, [SeedClassification.REFERENCE]),
      );
      expect(target.classifications).toEqual([SeedClassification.REFERENCE]);
    },
  );

  it("rejects an empty implicit classification selection", () => {
    expect(() =>
      assertSeedExecutionSafety(request("test", SAFE_TEST_DATABASE, [])),
    ).toThrow("At least one seed classification must be explicitly selected");
  });

  it("uses DATABASE_URL only when it names the same explicit safe target", () => {
    expect(
      assertSeedExecutionSafety({
        environment: {
          NODE_ENV: "test",
          DB_NAME: SAFE_TEST_DATABASE,
          DATABASE_URL: `postgresql://user:pass@localhost:5432/${SAFE_TEST_DATABASE}`,
        },
        classifications: [SeedClassification.TEST],
      }).databaseName,
    ).toBe(SAFE_TEST_DATABASE);

    expect(() =>
      assertSeedExecutionSafety({
        environment: {
          NODE_ENV: "test",
          DB_NAME: SAFE_TEST_DATABASE,
          DATABASE_URL: "postgresql://user:pass@localhost:5432/agrilink_db",
        },
        classifications: [SeedClassification.TEST],
      }),
    ).toThrow("Ambiguous seed database target");
  });
});
