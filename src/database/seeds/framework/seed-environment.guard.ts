import { assertDisposableDatabaseTarget } from "../../reconciliation/database-target.guard";
import {
  SeedClassification,
  SeedExecutionContext,
  SeedNodeEnvironment,
} from "./seed-contract";

export interface SeedExecutionSafetyRequest {
  readonly environment: Record<string, unknown>;
  readonly classifications: readonly SeedClassification[];
}

const CLASSIFICATIONS = new Set<string>(Object.values(SeedClassification));

function optionalString(
  environment: Record<string, unknown>,
  name: string,
): string | undefined {
  const value = environment[name];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string for seed execution`);
  }
  const normalized = value.trim();
  return normalized === "" ? undefined : normalized;
}

function databaseNameFromUrl(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      throw new Error();
    }
    const databaseName = decodeURIComponent(
      parsed.pathname.replace(/^\/+/, ""),
    );
    if (!databaseName || databaseName.includes("/")) {
      throw new Error();
    }
    return databaseName;
  } catch {
    throw new Error(
      "DATABASE_URL must identify an explicit PostgreSQL database for seed execution",
    );
  }
}

function resolveExplicitDatabaseName(
  environment: Record<string, unknown>,
): string {
  const configuredName = optionalString(environment, "DB_NAME");
  const databaseUrl = optionalString(environment, "DATABASE_URL");
  const urlName = databaseUrl ? databaseNameFromUrl(databaseUrl) : undefined;

  if (configuredName && urlName && configuredName !== urlName) {
    throw new Error(
      `Ambiguous seed database target: DB_NAME=${configuredName} does not match DATABASE_URL database ${urlName}`,
    );
  }

  const databaseName = urlName ?? configuredName;
  if (!databaseName) {
    throw new Error(
      "Explicit DB_NAME or DATABASE_URL is required for seed execution",
    );
  }
  return databaseName;
}

function resolveNodeEnvironment(
  environment: Record<string, unknown>,
): SeedNodeEnvironment {
  const nodeEnv = optionalString(environment, "NODE_ENV")?.toLowerCase();
  if (!nodeEnv) {
    throw new Error("Explicit NODE_ENV is required for seed execution");
  }
  if (nodeEnv === "production") {
    throw new Error("Database seed execution is disabled in production");
  }
  if (nodeEnv !== "development" && nodeEnv !== "test") {
    throw new Error(`Unsupported seed execution environment: ${nodeEnv}`);
  }
  return nodeEnv;
}

function validateClassificationSelection(
  nodeEnv: SeedNodeEnvironment,
  classifications: readonly SeedClassification[],
): readonly SeedClassification[] {
  if (classifications.length === 0) {
    throw new Error(
      "At least one seed classification must be explicitly selected",
    );
  }

  const unique = new Set<SeedClassification>();
  for (const classification of classifications) {
    if (!CLASSIFICATIONS.has(classification)) {
      throw new Error(`Invalid seed classification: ${String(classification)}`);
    }
    unique.add(classification);
  }

  if (unique.has(SeedClassification.DEV) && nodeEnv !== "development") {
    throw new Error(
      "DEV seeds are only allowed in the development environment",
    );
  }
  if (unique.has(SeedClassification.TEST) && nodeEnv !== "test") {
    throw new Error("TEST seeds are only allowed in the test environment");
  }

  return [...unique].sort();
}

export function assertSeedExecutionSafety(
  request: SeedExecutionSafetyRequest,
): SeedExecutionContext {
  const nodeEnv = resolveNodeEnvironment(request.environment);
  const databaseName = resolveExplicitDatabaseName(request.environment);
  assertDisposableDatabaseTarget(databaseName);
  const classifications = validateClassificationSelection(
    nodeEnv,
    request.classifications,
  );

  return { nodeEnv, databaseName, classifications };
}
