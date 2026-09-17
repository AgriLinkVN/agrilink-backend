import { SeedClassification } from "../seeds/framework/seed-contract";
import {
  assertSafePersistenceTestEnvironment,
  assertSafePersistenceTestTarget,
  PersistenceTestOperation,
  PersistenceTestPurpose,
} from "./database-target.guard";

const SAFE_DATABASE = "agrilink_persistence_test_guard_spec";

function fixtureWrite(
  overrides: Partial<Parameters<typeof assertSafePersistenceTestTarget>[0]> = {},
) {
  return {
    classification: SeedClassification.TEST,
    purpose: PersistenceTestPurpose.BUSINESS_FIXTURE,
    operation: PersistenceTestOperation.FIXTURE_WRITE,
    host: "localhost",
    database: SAFE_DATABASE,
    ...overrides,
  };
}

describe("persistence TEST target guard", () => {
  it("rejects the protected local database", () => {
    expect(() =>
      assertSafePersistenceTestTarget(
        fixtureWrite({ database: "agrilink_db" }),
      ),
    ).toThrow("Refusing to use protected database agrilink_db");
  });

  it("rejects a disposable name on an unauthorized remote host", () => {
    expect(() =>
      assertSafePersistenceTestTarget(
        fixtureWrite({ host: "db.example.internal" }),
      ),
    ).toThrow("Persistence test target host is not allowed");
  });

  it.each(["localhost", "127.0.0.1", "::1", "[::1]"])(
    "accepts approved local host %s with a disposable database",
    (host) => {
      expect(
        assertSafePersistenceTestTarget(fixtureWrite({ host })),
      ).toMatchObject({
        classification: SeedClassification.TEST,
        operation: PersistenceTestOperation.FIXTURE_WRITE,
        database: SAFE_DATABASE,
      });
    },
  );

  it("rejects a missing host", () => {
    expect(() =>
      assertSafePersistenceTestTarget(fixtureWrite({ host: undefined })),
    ).toThrow("test target host is required");
  });

  it("rejects a missing database", () => {
    expect(() =>
      assertSafePersistenceTestTarget(fixtureWrite({ database: undefined })),
    ).toThrow("test target database is required");
  });

  it("rejects an ambiguous or missing classification", () => {
    expect(() =>
      assertSafePersistenceTestTarget(
        fixtureWrite({ classification: undefined }),
      ),
    ).toThrow("requires SeedClassification.TEST");
  });

  it("rejects a non-TEST business fixture write", () => {
    expect(() =>
      assertSafePersistenceTestTarget(
        fixtureWrite({ classification: SeedClassification.DEV }),
      ),
    ).toThrow("requires SeedClassification.TEST");
  });

  it("rejects destructive lifecycle without exact acknowledgement", () => {
    const request = fixtureWrite({
      purpose: PersistenceTestPurpose.TEST_INFRASTRUCTURE,
      operation: PersistenceTestOperation.DISPOSABLE_DATABASE_LIFECYCLE,
    });
    expect(() => assertSafePersistenceTestTarget(request)).toThrow(
      "test target acknowledgement is required",
    );
    expect(() =>
      assertSafePersistenceTestTarget({
        ...request,
        acknowledgement: "wrong-target",
      }),
    ).toThrow("must exactly match the database name");
  });

  it("accepts destructive lifecycle with exact acknowledgement", () => {
    expect(
      assertSafePersistenceTestTarget({
        ...fixtureWrite({
          purpose: PersistenceTestPurpose.TEST_INFRASTRUCTURE,
          operation: PersistenceTestOperation.DISPOSABLE_DATABASE_LIFECYCLE,
        }),
        acknowledgement: SAFE_DATABASE,
      }),
    ).toMatchObject({ database: SAFE_DATABASE });
  });

  it("keeps read-only inspection non-destructive and acknowledgement-free", () => {
    expect(
      assertSafePersistenceTestTarget({
        ...fixtureWrite(),
        purpose: PersistenceTestPurpose.READ_ONLY_TEST_HARNESS,
        operation: PersistenceTestOperation.READ_ONLY_INSPECTION,
      }),
    ).toMatchObject({
      operation: PersistenceTestOperation.READ_ONLY_INSPECTION,
    });
  });

  it("fails closed on ambiguous URL and discrete target information", () => {
    expect(() =>
      assertSafePersistenceTestEnvironment({
        environment: {
          DB_HOST: "localhost",
          DB_NAME: SAFE_DATABASE,
          DATABASE_URL:
            "postgresql://user:pass@localhost:5432/agrilink_test",
        },
        classification: SeedClassification.TEST,
        purpose: PersistenceTestPurpose.READ_ONLY_TEST_HARNESS,
        operation: PersistenceTestOperation.READ_ONLY_INSPECTION,
      }),
    ).toThrow("Ambiguous persistence test target");
  });
});
