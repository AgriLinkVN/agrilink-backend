import {
  EMPTY_SEED_GROUP_RESULT,
  SeedClassification,
  SeedGroupMetadata,
  SeedGroupResult,
} from "./seed-contract";
import {
  SeedOutputRegistry,
  validateSeedGroupResult,
} from "./seed-dependency-outputs";

function metadata(
  id: string,
  dependencies: readonly string[],
): SeedGroupMetadata {
  return {
    id,
    owner: "test-owner",
    classification: SeedClassification.DEV,
    dependencies,
  };
}

function result(outputs: SeedGroupResult["outputs"]): SeedGroupResult {
  return { outputs };
}

describe("seed dependency scalar outputs", () => {
  it("accepts a deterministic empty result", () => {
    expect(
      validateSeedGroupResult("empty.group", EMPTY_SEED_GROUP_RESULT),
    ).toEqual({
      outputs: [],
    });
  });

  it("supports isolated string, number, and boolean bindings", () => {
    const registry = new SeedOutputRegistry();
    registry.register(
      "producer.group",
      result([
        {
          kind: "user.id.by-email",
          key: "farmer@agrilink.vn",
          value: "user-123",
        },
        { kind: "province.rank.by-code", key: "68", value: 4 },
        { kind: "feature.enabled.by-key", key: "demo", value: true },
      ]),
    );
    const outputs = registry.viewFor(
      metadata("consumer.group", ["producer.group"]),
    );

    expect(
      outputs.getString(
        "producer.group",
        "user.id.by-email",
        "farmer@agrilink.vn",
      ),
    ).toBe("user-123");
    expect(
      outputs.requireNumber("producer.group", "province.rank.by-code", "68"),
    ).toBe(4);
    expect(
      outputs.requireBoolean(
        "producer.group",
        "feature.enabled.by-key",
        "demo",
      ),
    ).toBe(true);
  });

  it("rejects duplicate kind and key bindings within one producer", () => {
    const registry = new SeedOutputRegistry();

    expect(() =>
      registry.register(
        "producer.group",
        result([
          {
            kind: "user.id.by-email",
            key: "same@agrilink.vn",
            value: "user-1",
          },
          {
            kind: "user.id.by-email",
            key: "same@agrilink.vn",
            value: "user-2",
          },
        ]),
      ),
    ).toThrow("DUPLICATE_OUTPUT_BINDING");
  });

  it("fails closed for undeclared dependencies", () => {
    const registry = new SeedOutputRegistry();
    registry.register(
      "producer.group",
      result([{ kind: "user.id.by-email", key: "x", value: "user-1" }]),
    );
    const outputs = registry.viewFor(metadata("consumer.group", []));

    expect(() =>
      outputs.getString("producer.group", "user.id.by-email", "x"),
    ).toThrow("UNDECLARED_DEPENDENCY_LOOKUP");
  });

  it("distinguishes optional missing outputs from required outputs", () => {
    const registry = new SeedOutputRegistry();
    registry.register("producer.group", EMPTY_SEED_GROUP_RESULT);
    const outputs = registry.viewFor(
      metadata("consumer.group", ["producer.group"]),
    );

    expect(
      outputs.getString("producer.group", "user.id.by-email", "missing"),
    ).toBeUndefined();
    expect(() =>
      outputs.requireString("producer.group", "user.id.by-email", "missing"),
    ).toThrow("MISSING_REQUIRED_OUTPUT");
  });

  it("rejects scalar type mismatches", () => {
    const registry = new SeedOutputRegistry();
    registry.register(
      "producer.group",
      result([{ kind: "user.id.by-email", key: "x", value: "user-1" }]),
    );
    const outputs = registry.viewFor(
      metadata("consumer.group", ["producer.group"]),
    );

    expect(() =>
      outputs.requireNumber("producer.group", "user.id.by-email", "x"),
    ).toThrow("OUTPUT_TYPE_MISMATCH");
  });

  it("isolates identical kind and key bindings by producer group", () => {
    const registry = new SeedOutputRegistry();
    registry.register(
      "producer.a",
      result([{ kind: "record.id.by-key", key: "same", value: "a-1" }]),
    );
    registry.register(
      "producer.b",
      result([{ kind: "record.id.by-key", key: "same", value: "b-1" }]),
    );
    const outputs = registry.viewFor(
      metadata("consumer.group", ["producer.a", "producer.b"]),
    );

    expect(
      outputs.requireString("producer.a", "record.id.by-key", "same"),
    ).toBe("a-1");
    expect(
      outputs.requireString("producer.b", "record.id.by-key", "same"),
    ).toBe("b-1");
  });

  it("uses a snapshot so future or nonexecuted outputs remain unavailable", () => {
    const registry = new SeedOutputRegistry();
    const beforeExecution = registry.viewFor(
      metadata("consumer.group", ["future.group"]),
    );
    registry.register(
      "future.group",
      result([{ kind: "record.id.by-key", key: "x", value: "future-1" }]),
    );

    expect(
      beforeExecution.getString("future.group", "record.id.by-key", "x"),
    ).toBeUndefined();
    expect(
      registry
        .viewFor(metadata("later.consumer", ["future.group"]))
        .requireString("future.group", "record.id.by-key", "x"),
    ).toBe("future-1");
  });

  it("rejects non-scalar output values at runtime", () => {
    expect(() =>
      validateSeedGroupResult("producer.group", {
        outputs: [
          {
            kind: "record.id.by-key",
            key: "x",
            value: { id: "entity-1" },
          },
        ],
      } as unknown as SeedGroupResult),
    ).toThrow("INVALID_SEED_OUTPUT_VALUE");
  });
});
