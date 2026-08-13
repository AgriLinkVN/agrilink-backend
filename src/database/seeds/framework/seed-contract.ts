export enum SeedClassification {
  REFERENCE = "REFERENCE",
  DEV = "DEV",
  TEST = "TEST",
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
  execute(): Promise<void>;
}
