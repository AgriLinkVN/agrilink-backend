import {
  SeedDependencyOutputs,
  SeedGroupMetadata,
  SeedGroupResult,
  SeedScalar,
} from "./seed-contract";

const MACHINE_READABLE_KIND = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

type KindOutputs = ReadonlyMap<string, ReadonlyMap<string, SeedScalar>>;
type ProducerOutputs = ReadonlyMap<string, KindOutputs>;

function describeBinding(
  producerGroupId: string,
  kind: string,
  key: string,
): string {
  return `${producerGroupId}/${kind}/${key}`;
}

function assertScalar(
  value: unknown,
  binding: string,
): asserts value is SeedScalar {
  const scalarType = typeof value;
  if (
    !["string", "number", "boolean"].includes(scalarType) ||
    (scalarType === "number" && !Number.isFinite(value))
  ) {
    throw new Error(
      `INVALID_SEED_OUTPUT_VALUE: ${binding} must be a finite scalar`,
    );
  }
}

export function validateSeedGroupResult(
  producerGroupId: string,
  result: SeedGroupResult,
): SeedGroupResult {
  if (!result || !Array.isArray(result.outputs)) {
    throw new Error(
      `INVALID_SEED_GROUP_RESULT: ${producerGroupId} must return an outputs array`,
    );
  }

  const seen = new Set<string>();
  const outputs = result.outputs.map((binding) => {
    if (!binding || !MACHINE_READABLE_KIND.test(binding.kind)) {
      throw new Error(
        `INVALID_SEED_OUTPUT_KIND: ${producerGroupId} returned ${String(binding?.kind)}`,
      );
    }
    if (typeof binding.key !== "string" || binding.key.trim() === "") {
      throw new Error(
        `INVALID_SEED_OUTPUT_KEY: ${producerGroupId}/${binding.kind} requires a stable key`,
      );
    }

    const identity = `${binding.kind}\u0000${binding.key}`;
    if (seen.has(identity)) {
      throw new Error(
        `DUPLICATE_OUTPUT_BINDING: ${describeBinding(
          producerGroupId,
          binding.kind,
          binding.key,
        )}`,
      );
    }
    seen.add(identity);
    assertScalar(
      binding.value,
      describeBinding(producerGroupId, binding.kind, binding.key),
    );
    return Object.freeze({ ...binding });
  });

  return Object.freeze({ outputs: Object.freeze(outputs) });
}

class DependencyOutputView implements SeedDependencyOutputs {
  constructor(
    private readonly declaredDependencies: ReadonlySet<string>,
    private readonly producerOutputs: ProducerOutputs,
  ) {}

  getString(
    producerGroupId: string,
    kind: string,
    key: string,
  ): string | undefined {
    return this.getTyped(producerGroupId, kind, key, "string") as
      | string
      | undefined;
  }

  requireString(producerGroupId: string, kind: string, key: string): string {
    return this.requireTyped(producerGroupId, kind, key, "string") as string;
  }

  getNumber(
    producerGroupId: string,
    kind: string,
    key: string,
  ): number | undefined {
    return this.getTyped(producerGroupId, kind, key, "number") as
      | number
      | undefined;
  }

  requireNumber(producerGroupId: string, kind: string, key: string): number {
    return this.requireTyped(producerGroupId, kind, key, "number") as number;
  }

  getBoolean(
    producerGroupId: string,
    kind: string,
    key: string,
  ): boolean | undefined {
    return this.getTyped(producerGroupId, kind, key, "boolean") as
      | boolean
      | undefined;
  }

  requireBoolean(producerGroupId: string, kind: string, key: string): boolean {
    return this.requireTyped(producerGroupId, kind, key, "boolean") as boolean;
  }

  private getTyped(
    producerGroupId: string,
    kind: string,
    key: string,
    expectedType: "string" | "number" | "boolean",
  ): SeedScalar | undefined {
    this.assertDeclared(producerGroupId);
    const value = this.producerOutputs
      .get(producerGroupId)
      ?.get(kind)
      ?.get(key);
    if (value !== undefined && typeof value !== expectedType) {
      throw new Error(
        `OUTPUT_TYPE_MISMATCH: ${describeBinding(
          producerGroupId,
          kind,
          key,
        )} is ${typeof value}, expected ${expectedType}`,
      );
    }
    return value;
  }

  private requireTyped(
    producerGroupId: string,
    kind: string,
    key: string,
    expectedType: "string" | "number" | "boolean",
  ): SeedScalar {
    const value = this.getTyped(producerGroupId, kind, key, expectedType);
    if (value === undefined) {
      throw new Error(
        `MISSING_REQUIRED_OUTPUT: ${describeBinding(producerGroupId, kind, key)}`,
      );
    }
    return value;
  }

  private assertDeclared(producerGroupId: string): void {
    if (!this.declaredDependencies.has(producerGroupId)) {
      throw new Error(
        `UNDECLARED_DEPENDENCY_LOOKUP: ${producerGroupId} is not a declared dependency`,
      );
    }
  }
}

export const EMPTY_SEED_DEPENDENCY_OUTPUTS: SeedDependencyOutputs =
  Object.freeze(new DependencyOutputView(new Set(), new Map()));

export class SeedOutputRegistry {
  private readonly outputsByProducer = new Map<string, KindOutputs>();

  register(producerGroupId: string, result: SeedGroupResult): void {
    if (this.outputsByProducer.has(producerGroupId)) {
      throw new Error(
        `DUPLICATE_SEED_GROUP_RESULT: outputs already registered for ${producerGroupId}`,
      );
    }

    const validated = validateSeedGroupResult(producerGroupId, result);
    const byKind = new Map<string, Map<string, SeedScalar>>();
    for (const binding of validated.outputs) {
      const byKey = byKind.get(binding.kind) ?? new Map<string, SeedScalar>();
      byKey.set(binding.key, binding.value);
      byKind.set(binding.kind, byKey);
    }
    this.outputsByProducer.set(producerGroupId, byKind);
  }

  viewFor(consumer: SeedGroupMetadata): SeedDependencyOutputs {
    const declaredDependencies = new Set(consumer.dependencies);
    const visibleOutputs = new Map<string, KindOutputs>();
    for (const producerGroupId of declaredDependencies) {
      const outputs = this.outputsByProducer.get(producerGroupId);
      if (outputs) visibleOutputs.set(producerGroupId, outputs);
    }
    return Object.freeze(
      new DependencyOutputView(declaredDependencies, visibleOutputs),
    );
  }
}
