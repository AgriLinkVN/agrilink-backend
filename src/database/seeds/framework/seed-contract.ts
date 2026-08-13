export enum SeedClassification {
  REFERENCE = "REFERENCE",
  DEV = "DEV",
  TEST = "TEST",
}

export type SeedNodeEnvironment = "development" | "test";

/**
 * Narrow execution facts returned by the shared fail-closed safety guard.
 * Owner-local implementations receive no raw environment or persistence
 * framework primitives through the central orchestration contract.
 */
export interface SeedExecutionContext {
  readonly nodeEnv: SeedNodeEnvironment;
  readonly databaseName: string;
  readonly classifications: readonly SeedClassification[];
}

export interface SeedGroupMetadata {
  readonly id: string;
  readonly owner: string;
  readonly classification: SeedClassification;
  readonly dependencies: readonly string[];
  readonly description?: string;
}

/**
 * Owner modules keep persistence details behind this contract. The central
 * orchestrator only sees metadata and an opaque execution boundary.
 */
export interface SeedGroup {
  readonly metadata: SeedGroupMetadata;
  execute(context: SeedExecutionContext): Promise<void>;
}
