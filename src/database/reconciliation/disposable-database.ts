import { randomBytes } from "crypto";
import { DataSource } from "typeorm";

import { parseDatabaseEnvironment } from "../../config/database-environment";
import {
  assertDisposableDatabaseTarget,
  assertSafePersistenceTestTarget,
  PersistenceTestOperation,
  PersistenceTestPurpose,
} from "./database-target.guard";
import { SeedClassification } from "../seeds/framework/seed-contract";

const DATABASE_IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;

export interface DisposableDatabaseTestTarget {
  readonly classification: SeedClassification.TEST;
  readonly purpose: PersistenceTestPurpose;
  readonly database: string;
  readonly acknowledgement: string;
}

export function createDisposableDatabaseName(): string {
  const timestamp = Date.now().toString(36);
  const entropy = randomBytes(4).toString("hex");
  const database = `agrilink_persistence_test_${timestamp}_${entropy}`;
  assertDisposableDatabaseTarget(database);
  return database;
}

export function createAdminDataSource(
  env: Record<string, unknown>,
  target: DisposableDatabaseTestTarget,
): DataSource {
  if (
    typeof env.DATABASE_URL === "string" &&
    env.DATABASE_URL.trim() !== ""
  ) {
    throw new Error(
      "Generated disposable database lifecycle requires explicit DB_* settings, not DATABASE_URL",
    );
  }
  const parsed = parseDatabaseEnvironment({
    ...env,
    DB_SYNCHRONIZE: "false",
    PRODUCT_DEV_SEED: "false",
    PRODUCT_DEV_SEED_RESET: "false",
  });
  assertLifecycleTarget(parsed.host, target);
  return new DataSource({
    type: "postgres",
    host: parsed.host,
    port: parsed.port,
    username: parsed.username,
    password: parsed.password,
    database: "postgres",
    schema: parsed.schema,
    entities: [],
    migrations: [],
    synchronize: false,
    logging: false,
    extra: {
      max: 1,
      connectionTimeoutMillis: 2_000,
    },
  });
}

export async function createDisposableDatabase(
  admin: DataSource,
  target: DisposableDatabaseTestTarget,
): Promise<void> {
  const { database } = target;
  assertSafeDatabaseIdentifier(database);
  assertLifecycleTarget(adminHost(admin), target);
  await admin.query(`CREATE DATABASE "${database}"`);
}

export async function dropDisposableDatabase(
  admin: DataSource,
  target: DisposableDatabaseTestTarget,
): Promise<void> {
  const { database } = target;
  assertSafeDatabaseIdentifier(database);
  assertLifecycleTarget(adminHost(admin), target);
  await admin.query(
    `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1
        AND pid <> pg_backend_pid()
    `,
    [database],
  );
  await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
}

function assertLifecycleTarget(
  host: string,
  target: DisposableDatabaseTestTarget,
): void {
  assertSafePersistenceTestTarget({
    classification: target.classification,
    purpose: target.purpose,
    operation: PersistenceTestOperation.DISPOSABLE_DATABASE_LIFECYCLE,
    host,
    database: target.database,
    acknowledgement: target.acknowledgement,
  });
}

function adminHost(admin: DataSource): string {
  if (admin.options.type !== "postgres") {
    throw new Error("Disposable database lifecycle requires PostgreSQL");
  }
  return String(admin.options.host ?? "");
}

function assertSafeDatabaseIdentifier(database: string): void {
  if (!DATABASE_IDENTIFIER.test(database)) {
    throw new Error(`Unsafe disposable database identifier: ${database}`);
  }
}
