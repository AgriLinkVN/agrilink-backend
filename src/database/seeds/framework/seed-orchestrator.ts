import { SeedClassification, SeedGroup } from "./seed-contract";
import {
  assertSeedExecutionSafety,
  SeedExecutionSafetyRequest,
} from "./seed-environment.guard";
import { buildSeedExecutionPlan } from "./seed-metadata";

export interface SeedOrchestrationRequest {
  readonly environment: Record<string, unknown>;
  readonly classifications: readonly SeedClassification[];
}

export class SeedOrchestrator {
  constructor(private readonly groups: readonly SeedGroup[]) {}

  async execute(request: SeedOrchestrationRequest): Promise<readonly string[]> {
    const safeTarget = assertSeedExecutionSafety(
      request as SeedExecutionSafetyRequest,
    );
    const plan = buildSeedExecutionPlan(
      this.groups,
      safeTarget.classifications,
    );

    for (const group of plan) {
      await group.execute(safeTarget);
    }

    return plan.map((group) => group.metadata.id);
  }
}
