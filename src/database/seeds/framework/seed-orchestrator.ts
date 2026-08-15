import { SeedClassification, SeedGroup } from "./seed-contract";
import { SeedOutputRegistry } from "./seed-dependency-outputs";
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
    const outputRegistry = new SeedOutputRegistry();

    for (const group of plan) {
      const context = Object.freeze({
        ...safeTarget,
        dependencies: outputRegistry.viewFor(group.metadata),
      });
      const result = await group.execute(context);
      outputRegistry.register(group.metadata.id, result);
    }

    return plan.map((group) => group.metadata.id);
  }
}
