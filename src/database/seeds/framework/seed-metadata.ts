import {
  SeedClassification,
  SeedGroup,
  SeedGroupMetadata,
} from "./seed-contract";

const MACHINE_READABLE_ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const CLASSIFICATIONS = new Set<string>(Object.values(SeedClassification));

function compareStableIds(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function validateSeedGroupMetadata(metadata: SeedGroupMetadata): void {
  if (!MACHINE_READABLE_ID.test(metadata.id)) {
    throw new Error(`Invalid seed group id: ${String(metadata.id)}`);
  }
  if (!MACHINE_READABLE_ID.test(metadata.owner)) {
    throw new Error(
      `Invalid owner for seed group ${metadata.id}: ${String(metadata.owner)}`,
    );
  }
  if (!CLASSIFICATIONS.has(metadata.classification)) {
    throw new Error(
      `Invalid classification for seed group ${metadata.id}: ${String(
        metadata.classification,
      )}`,
    );
  }
  if (!Array.isArray(metadata.dependencies)) {
    throw new Error(
      `Dependencies must be an array for seed group ${metadata.id}`,
    );
  }

  const dependencies = new Set<string>();
  for (const dependency of metadata.dependencies) {
    if (!MACHINE_READABLE_ID.test(dependency)) {
      throw new Error(
        `Invalid dependency id for seed group ${metadata.id}: ${String(
          dependency,
        )}`,
      );
    }
    if (dependencies.has(dependency)) {
      throw new Error(
        `Duplicate dependency ${dependency} in seed group ${metadata.id}`,
      );
    }
    dependencies.add(dependency);
  }
}

export function orderSeedMetadata<T extends SeedGroupMetadata>(
  groups: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const group of groups) {
    validateSeedGroupMetadata(group);
    if (byId.has(group.id)) {
      throw new Error(`Duplicate seed group id: ${group.id}`);
    }
    byId.set(group.id, group);
  }

  const sortedGroups = [...groups].sort((left, right) =>
    compareStableIds(left.id, right.id),
  );
  const dependentIds = new Map<string, string[]>();
  const dependencyCounts = new Map<string, number>();

  for (const group of sortedGroups) {
    const dependencies = [...group.dependencies].sort(compareStableIds);
    for (const dependency of dependencies) {
      if (dependency === group.id) {
        throw new Error(`Seed group ${group.id} cannot depend on itself`);
      }
      if (!byId.has(dependency)) {
        throw new Error(
          `Seed group ${group.id} has missing dependency: ${dependency}`,
        );
      }
      const dependents = dependentIds.get(dependency) ?? [];
      dependents.push(group.id);
      dependentIds.set(dependency, dependents);
    }
    dependencyCounts.set(group.id, dependencies.length);
  }

  const ready = sortedGroups
    .filter((group) => dependencyCounts.get(group.id) === 0)
    .map((group) => group.id);
  const ordered: T[] = [];

  while (ready.length > 0) {
    const id = ready.shift() as string;
    ordered.push(byId.get(id) as T);

    const dependents = (dependentIds.get(id) ?? []).sort(compareStableIds);
    for (const dependent of dependents) {
      const remaining = (dependencyCounts.get(dependent) as number) - 1;
      dependencyCounts.set(dependent, remaining);
      if (remaining === 0) {
        ready.push(dependent);
        ready.sort(compareStableIds);
      }
    }
  }

  if (ordered.length !== groups.length) {
    const unresolved = sortedGroups
      .map((group) => group.id)
      .filter((id) => !ordered.some((group) => group.id === id));
    throw new Error(`Seed dependency cycle detected: ${unresolved.join(", ")}`);
  }

  return ordered;
}

export function buildSeedExecutionPlan(
  groups: readonly SeedGroup[],
  classifications: readonly SeedClassification[],
): SeedGroup[] {
  orderSeedMetadata(groups.map((group) => group.metadata));
  const requested = new Set(classifications);
  const selected = groups.filter((group) =>
    requested.has(group.metadata.classification),
  );
  const orderedMetadata = orderSeedMetadata(
    selected.map((group) => group.metadata),
  );
  const selectedById = new Map(
    selected.map((group) => [group.metadata.id, group]),
  );
  return orderedMetadata.map(
    (metadata) => selectedById.get(metadata.id) as SeedGroup,
  );
}
