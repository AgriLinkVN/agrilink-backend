import { SeedClassification } from "../seeds/framework/seed-contract";

const DISPOSABLE_DATABASE_PREFIXES = [
  "agrilink_schema_parity_",
  "agrilink_persistence_test_",
] as const;

const DEDICATED_TEST_DATABASES = new Set([
  "agrilink_test",
  "agrilink_migration_test",
  "agrilink_p3_phase1_verify",
]);

const PROTECTED_DATABASES = new Set(["agrilink_db"]);
const TEST_HOST_ALLOWLIST = new Set(["localhost", "127.0.0.1", "::1"]);
const DATABASE_IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;

export enum PersistenceTestPurpose {
  BUSINESS_FIXTURE = "BUSINESS_FIXTURE",
  MIGRATION_TEST_HARNESS = "MIGRATION_TEST_HARNESS",
  READ_ONLY_TEST_HARNESS = "READ_ONLY_TEST_HARNESS",
  TEST_INFRASTRUCTURE = "TEST_INFRASTRUCTURE",
}

export enum PersistenceTestOperation {
  READ_ONLY_INSPECTION = "READ_ONLY_INSPECTION",
  DISPOSABLE_DATABASE_LIFECYCLE = "DISPOSABLE_DATABASE_LIFECYCLE",
  MIGRATION_VERIFICATION = "MIGRATION_VERIFICATION",
  FIXTURE_WRITE = "FIXTURE_WRITE",
  DESTRUCTIVE_CLEANUP = "DESTRUCTIVE_CLEANUP",
}

export interface PersistenceTestTargetRequest {
  readonly classification: unknown;
  readonly purpose: unknown;
  readonly operation: unknown;
  readonly host: unknown;
  readonly database: unknown;
  readonly acknowledgement?: unknown;
}

export interface PersistenceTestEnvironmentRequest
  extends Omit<PersistenceTestTargetRequest, "host" | "database"> {
  readonly environment: Record<string, unknown>;
}

export interface VerifiedPersistenceTestTarget {
  readonly classification: SeedClassification.TEST;
  readonly purpose: PersistenceTestPurpose;
  readonly operation: PersistenceTestOperation;
  readonly host: string;
  readonly database: string;
}

const PURPOSE_OPERATIONS: Readonly<
  Record<PersistenceTestPurpose, ReadonlySet<PersistenceTestOperation>>
> = {
  [PersistenceTestPurpose.BUSINESS_FIXTURE]: new Set([
    PersistenceTestOperation.FIXTURE_WRITE,
    PersistenceTestOperation.DISPOSABLE_DATABASE_LIFECYCLE,
    PersistenceTestOperation.DESTRUCTIVE_CLEANUP,
  ]),
  [PersistenceTestPurpose.MIGRATION_TEST_HARNESS]: new Set([
    PersistenceTestOperation.MIGRATION_VERIFICATION,
    PersistenceTestOperation.DISPOSABLE_DATABASE_LIFECYCLE,
    PersistenceTestOperation.DESTRUCTIVE_CLEANUP,
  ]),
  [PersistenceTestPurpose.READ_ONLY_TEST_HARNESS]: new Set([
    PersistenceTestOperation.READ_ONLY_INSPECTION,
  ]),
  [PersistenceTestPurpose.TEST_INFRASTRUCTURE]: new Set([
    PersistenceTestOperation.READ_ONLY_INSPECTION,
    PersistenceTestOperation.DISPOSABLE_DATABASE_LIFECYCLE,
    PersistenceTestOperation.DESTRUCTIVE_CLEANUP,
  ]),
};

const ACKNOWLEDGEMENT_REQUIRED = new Set<PersistenceTestOperation>([
  PersistenceTestOperation.DISPOSABLE_DATABASE_LIFECYCLE,
  PersistenceTestOperation.MIGRATION_VERIFICATION,
  PersistenceTestOperation.DESTRUCTIVE_CLEANUP,
]);

export function assertDisposableDatabaseTarget(database: string): void {
  assertSafePersistenceTestDatabaseIdentifier(database);
  if (
    !DISPOSABLE_DATABASE_PREFIXES.some((prefix) => database.startsWith(prefix))
  ) {
    throw new Error(
      `Disposable database must start with ${DISPOSABLE_DATABASE_PREFIXES.join(
        " or ",
      )}`,
    );
  }
}

export function assertSafePersistenceTestTarget(
  request: PersistenceTestTargetRequest,
): VerifiedPersistenceTestTarget {
  if (request.classification !== SeedClassification.TEST) {
    throw new Error(
      "Persistence test execution requires SeedClassification.TEST",
    );
  }

  const purpose = requiredEnumValue(
    request.purpose,
    PersistenceTestPurpose,
    "persistence test purpose",
  );
  const operation = requiredEnumValue(
    request.operation,
    PersistenceTestOperation,
    "persistence test operation",
  );
  if (!PURPOSE_OPERATIONS[purpose].has(operation)) {
    throw new Error(
      `Persistence test purpose ${purpose} cannot perform ${operation}`,
    );
  }

  const host = normalizeHost(requiredString(request.host, "test target host"));
  if (!TEST_HOST_ALLOWLIST.has(host)) {
    throw new Error(`Persistence test target host is not allowed: ${host}`);
  }

  const database = requiredString(request.database, "test target database");
  assertApprovedPersistenceTestDatabase(database);

  if (ACKNOWLEDGEMENT_REQUIRED.has(operation)) {
    const acknowledgement = requiredString(
      request.acknowledgement,
      "test target acknowledgement",
    );
    if (acknowledgement !== database) {
      throw new Error(
        "Test target acknowledgement must exactly match the database name",
      );
    }
  }

  return {
    classification: SeedClassification.TEST,
    purpose,
    operation,
    host,
    database,
  };
}

export function assertSafePersistenceTestEnvironment(
  request: PersistenceTestEnvironmentRequest,
): VerifiedPersistenceTestTarget {
  const directHost = optionalString(request.environment.DB_HOST, "DB_HOST");
  const directDatabase = optionalString(
    request.environment.DB_NAME,
    "DB_NAME",
  );
  const databaseUrl = optionalString(
    request.environment.DATABASE_URL,
    "DATABASE_URL",
  );
  const urlTarget = databaseUrl
    ? persistenceTargetFromDatabaseUrl(databaseUrl)
    : undefined;

  if (
    directHost &&
    urlTarget &&
    normalizeHost(directHost) !== urlTarget.host
  ) {
    throw new Error(
      "Ambiguous persistence test target: DB_HOST does not match DATABASE_URL",
    );
  }
  if (
    directDatabase &&
    urlTarget &&
    directDatabase !== urlTarget.database
  ) {
    throw new Error(
      "Ambiguous persistence test target: DB_NAME does not match DATABASE_URL",
    );
  }

  return assertSafePersistenceTestTarget({
    classification: request.classification,
    purpose: request.purpose,
    operation: request.operation,
    acknowledgement: request.acknowledgement,
    host: urlTarget?.host ?? directHost,
    database: urlTarget?.database ?? directDatabase,
  });
}

function assertApprovedPersistenceTestDatabase(database: string): void {
  assertSafePersistenceTestDatabaseIdentifier(database);
  if (
    !DEDICATED_TEST_DATABASES.has(database) &&
    !DISPOSABLE_DATABASE_PREFIXES.some((prefix) => database.startsWith(prefix))
  ) {
    throw new Error(
      "Persistence test database must be a dedicated or disposable test target",
    );
  }
}

function assertSafePersistenceTestDatabaseIdentifier(database: string): void {
  if (!DATABASE_IDENTIFIER.test(database)) {
    throw new Error(`Unsafe persistence test database identifier: ${database}`);
  }
  if (PROTECTED_DATABASES.has(database)) {
    throw new Error(`Refusing to use protected database ${database}`);
  }
}

function persistenceTargetFromDatabaseUrl(databaseUrl: string): {
  host: string;
  database: string;
} {
  try {
    const parsed = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
      throw new Error();
    }
    const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    if (!parsed.hostname || !database || database.includes('/')) {
      throw new Error();
    }
    return { host: normalizeHost(parsed.hostname), database };
  } catch {
    throw new Error(
      "DATABASE_URL must identify an explicit PostgreSQL test target",
    );
  }
}

function optionalString(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string for persistence test execution`);
  }
  const normalized = value.trim();
  return normalized === "" ? undefined : normalized;
}

function requiredString(value: unknown, name: string): string {
  const normalized = optionalString(value, name);
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

function normalizeHost(host: string): string {
  const normalized = host.toLowerCase();
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    return normalized.slice(1, -1);
  }
  return normalized;
}

function requiredEnumValue<T extends Record<string, string>>(
  value: unknown,
  values: T,
  name: string,
): T[keyof T] {
  if (
    typeof value !== "string" ||
    !Object.values(values).includes(value as T[keyof T])
  ) {
    throw new Error(`Explicit ${name} is required`);
  }
  return value as T[keyof T];
}
