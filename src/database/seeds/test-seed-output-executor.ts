import { DataSource } from "typeorm";
import {
  SeedClassification,
  SeedDependencyOutputs,
  SeedGroupMetadata,
} from "./framework/seed-contract";
import { SeedOutputRegistry } from "./framework/seed-dependency-outputs";
import {
  assertSeedExecutionSafety,
  SeedExecutionSafetyRequest,
} from "./framework/seed-environment.guard";
import { buildSeedExecutionPlan } from "./framework/seed-metadata";
import { createSharedTestIdentitySeedGroups } from "./test-seed-groups.registry";

export interface SharedTestIdentitySeedExecution {
  readonly executedGroupIds: readonly string[];
  readonly outputs: SeedDependencyOutputs;
}

/**
 * TEST-harness-only adapter for consuming outputs from the approved shared
 * identity providers. It owns no fixture payload, initializes no DataSource,
 * and keeps group dependency enforcement inside SeedOutputRegistry.
 */
export async function executeSharedTestIdentitySeedGroupsWithOutputs(
  dataSource: DataSource,
  request: SeedExecutionSafetyRequest,
): Promise<SharedTestIdentitySeedExecution> {
  if (
    request.classifications.length !== 1 ||
    request.classifications[0] !== SeedClassification.TEST
  ) {
    throw new Error(
      "Shared TEST identity output execution requires explicit TEST-only selection",
    );
  }

  const safeTarget = assertSeedExecutionSafety(request);
  const groups = createSharedTestIdentitySeedGroups(dataSource);
  const plan = buildSeedExecutionPlan(groups, safeTarget.classifications);
  const outputRegistry = new SeedOutputRegistry();

  for (const group of plan) {
    const result = await group.execute(
      Object.freeze({
        ...safeTarget,
        dependencies: outputRegistry.viewFor(group.metadata),
      }),
    );
    outputRegistry.register(group.metadata.id, result);
  }

  const firstGroup = plan[0];
  if (!firstGroup) {
    throw new Error("Shared TEST identity execution produced an empty plan");
  }
  const outputConsumerMetadata: SeedGroupMetadata = Object.freeze({
    ...firstGroup.metadata,
    dependencies: Object.freeze(plan.map(({ metadata }) => metadata.id)),
  });

  return Object.freeze({
    executedGroupIds: Object.freeze(plan.map(({ metadata }) => metadata.id)),
    outputs: outputRegistry.viewFor(outputConsumerMetadata),
  });
}
