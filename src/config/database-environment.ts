import { parseEnvBoolean } from "./parse-env-boolean";

export type DatabaseEnvironment = Record<string, unknown>;

export interface ParsedDatabaseEnvironment {
  nodeEnv: string;
  databaseUrl?: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  schema: string;
  logging: boolean;
  synchronize: false;
  productDevSeed: boolean;
  productDevSeedReset: boolean;
}

function optionalString(
  env: DatabaseEnvironment,
  name: string,
  fallback: string,
): string {
  const value = env[name];
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") throw new Error(`${name} must be a string`);
  return value.trim();
}

function requiredString(env: DatabaseEnvironment, name: string): string {
  const value = env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required for database configuration`);
  }
  return value.trim();
}

function parsePortValue(raw: string): number {
  if (!/^\d+$/.test(raw)) throw new Error("DB_PORT must be an integer");
  const port = Number(raw);
  if (port < 1 || port > 65535) {
    throw new Error("DB_PORT must be between 1 and 65535");
  }
  return port;
}

function parseDatabaseUrl(
  env: DatabaseEnvironment,
): Pick<
  ParsedDatabaseEnvironment,
  "databaseUrl" | "host" | "port" | "database" | "username" | "password"
> | null {
  const value = env.DATABASE_URL;
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("DATABASE_URL must be a string");
  }
  const databaseUrl = value.trim();
  if (databaseUrl === "") return null;

  try {
    const parsed = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      throw new Error();
    }
    const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    const username = decodeURIComponent(parsed.username);
    const password = decodeURIComponent(parsed.password);
    if (!parsed.hostname || !database || !username || !password) {
      throw new Error();
    }
    return {
      databaseUrl,
      host: parsed.hostname,
      port: parsed.port ? parsePortValue(parsed.port) : 5432,
      database,
      username,
      password,
    };
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL");
  }
}

export function parseDatabaseEnvironment(
  env: DatabaseEnvironment,
): ParsedDatabaseEnvironment {
  const nodeEnv = optionalString(env, "NODE_ENV", "development").toLowerCase();
  const synchronizeRequested = parseEnvBoolean(
    env.DB_SYNCHRONIZE,
    "DB_SYNCHRONIZE",
    false,
  );
  const productDevSeed = parseEnvBoolean(
    env.PRODUCT_DEV_SEED,
    "PRODUCT_DEV_SEED",
    false,
  );
  const productDevSeedReset = parseEnvBoolean(
    env.PRODUCT_DEV_SEED_RESET,
    "PRODUCT_DEV_SEED_RESET",
    false,
  );

  if (nodeEnv === "production" && synchronizeRequested) {
    throw new Error("DB_SYNCHRONIZE must be false in production.");
  }
  if (synchronizeRequested) {
    throw new Error(
      "DB_SYNCHRONIZE must be false; use migrations for schema changes.",
    );
  }
  if (nodeEnv === "production" && (productDevSeed || productDevSeedReset)) {
    throw new Error("Development seed flags must be false in production.");
  }

  const urlConnection = parseDatabaseUrl(env);
  if (nodeEnv === "production" && !urlConnection) {
    throw new Error("DATABASE_URL is required in production.");
  }

  const connection = urlConnection ?? {
    host: requiredString(env, "DB_HOST"),
    port: parsePortValue(requiredString(env, "DB_PORT")),
    database: requiredString(env, "DB_NAME"),
    username: requiredString(env, "DB_USER"),
    password: requiredString(env, "DB_PASS"),
  };

  return {
    nodeEnv,
    databaseUrl: urlConnection?.databaseUrl,
    host: connection.host,
    port: connection.port,
    database: connection.database,
    username: connection.username,
    password: connection.password,
    schema: optionalString(env, "DB_SCHEMA", "public"),
    logging: parseEnvBoolean(env.DB_LOGGING, "DB_LOGGING", false),
    synchronize: false,
    productDevSeed,
    productDevSeedReset,
  };
}

export function assertSeedEnvironment(env: DatabaseEnvironment): void {
  const parsed = parseDatabaseEnvironment(env);
  if (parsed.nodeEnv === "production") {
    throw new Error("Database seed is disabled in production.");
  }
}
