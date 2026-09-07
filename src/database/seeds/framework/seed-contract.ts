export enum SeedClassification {
  REFERENCE = "REFERENCE",
  DEV = "DEV",
  TEST = "TEST",
}

export type SeedNodeEnvironment = "development" | "test";

export type SeedScalar = string | number | boolean;

export interface SeedOutputBinding {
  readonly kind: string;
  readonly key: string;
  readonly value: SeedScalar;
}

export interface SeedGroupResult {
  readonly outputs: readonly SeedOutputBinding[];
}

export const EMPTY_SEED_GROUP_RESULT: SeedGroupResult = Object.freeze({
  outputs: Object.freeze([]),
});

export interface SeedDependencyOutputs {
  getString(
    producerGroupId: string,
    kind: string,
    key: string,
  ): string | undefined;
  requireString(producerGroupId: string, kind: string, key: string): string;
  getNumber(
    producerGroupId: string,
    kind: string,
    key: string,
  ): number | undefined;
  requireNumber(producerGroupId: string, kind: string, key: string): number;
  getBoolean(
    producerGroupId: string,
    kind: string,
    key: string,
  ): boolean | undefined;
  requireBoolean(producerGroupId: string, kind: string, key: string): boolean;
}

/**
 * Narrow execution facts returned by the shared fail-closed safety guard.
 * Owner-local implementations receive no raw environment or persistence
 * framework primitives through the central orchestration contract.
 */
export interface VerifiedSeedExecutionTarget {
  readonly nodeEnv: SeedNodeEnvironment;
  readonly databaseName: string;
  readonly classifications: readonly SeedClassification[];
}

export interface SeedExecutionContext extends VerifiedSeedExecutionTarget {
  readonly dependencies: SeedDependencyOutputs;
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
  execute(context: SeedExecutionContext): Promise<SeedGroupResult>;
}
