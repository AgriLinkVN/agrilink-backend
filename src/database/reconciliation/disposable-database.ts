import { randomBytes } from "crypto";
import { DataSource } from "typeorm";

import { parseDatabaseEnvironment } from "../../config/database-environment";
import { assertDisposableDatabaseTarget } from "./database-target.guard";

const DATABASE_IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;

export function createDisposableDatabaseName(): string {
  const timestamp = Date.now().toString(36);
  const entropy = randomBytes(4).toString("hex");
  const database = `agrilink_persistence_test_${timestamp}_${entropy}`;
  assertDisposableDatabaseTarget(database);
  return database;
}

export function createAdminDataSource(
  env: Record<string, unknown>,
): DataSource {
  const parsed = parseDatabaseEnvironment({
    ...env,
    DB_SYNCHRONIZE: "false",
    PRODUCT_DEV_SEED: "false",
    PRODUCT_DEV_SEED_RESET: "false",
  });
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
  database: string,
): Promise<void> {
  assertSafeDatabaseIdentifier(database);
  assertDisposableDatabaseTarget(database);
  await admin.query(`CREATE DATABASE "${database}"`);
}

export async function dropDisposableDatabase(
  admin: DataSource,
  database: string,
): Promise<void> {
  assertSafeDatabaseIdentifier(database);
  assertDisposableDatabaseTarget(database);
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

function assertSafeDatabaseIdentifier(database: string): void {
  if (!DATABASE_IDENTIFIER.test(database)) {
    throw new Error(`Unsafe disposable database identifier: ${database}`);
  }
}
