import { parseEnvBoolean } from "./parse-env-boolean";

export type DatabaseEnvironment = Record<string, unknown>;

export interface ParsedDatabaseEnvironment {
  nodeEnv: string;
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

function parsePort(env: DatabaseEnvironment): number {
  const raw = optionalString(env, "DB_PORT", "5432");
  if (!/^\d+$/.test(raw)) throw new Error("DB_PORT must be an integer");
  const port = Number(raw);
  if (port < 1 || port > 65535) {
    throw new Error("DB_PORT must be between 1 and 65535");
  }
  return port;
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

  return {
    nodeEnv,
    host: optionalString(env, "DB_HOST", "localhost"),
    port: parsePort(env),
    database: optionalString(env, "DB_NAME", "agrilink_db"),
    username: optionalString(env, "DB_USER", "postgres"),
    password: optionalString(env, "DB_PASS", ""),
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
