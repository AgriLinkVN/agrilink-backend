import { SeedClassification, SeedGroupMetadata } from "./seed-contract";
import { orderSeedMetadata, validateSeedGroupMetadata } from "./seed-metadata";

function metadata(
  id: string,
  dependencies: readonly string[] = [],
): SeedGroupMetadata {
  return {
    id,
    owner: "products",
    classification: SeedClassification.DEV,
    dependencies,
  };
}

describe("seed metadata validation and dependency DAG", () => {
  it("accepts complete framework-neutral classification metadata", () => {
    expect(() =>
      validateSeedGroupMetadata(metadata("products.catalog")),
    ).not.toThrow();
  });

  it("rejects an invalid classification at runtime", () => {
    expect(() =>
      validateSeedGroupMetadata({
        ...metadata("products.catalog"),
        classification: "BOOTSTRAP_OR_STARTUP_SEED",
      } as never),
    ).toThrow("Invalid classification");
  });

  it("rejects duplicate seed group IDs", () => {
    expect(() =>
      orderSeedMetadata([metadata("users.dev"), metadata("users.dev")]),
    ).toThrow("Duplicate seed group id: users.dev");
  });

  it("rejects a missing dependency", () => {
    expect(() =>
      orderSeedMetadata([metadata("products.dev", ["users.dev"])]),
    ).toThrow("Seed group products.dev has missing dependency: users.dev");
  });

  it("rejects self-dependency", () => {
    expect(() =>
      orderSeedMetadata([metadata("users.dev", ["users.dev"])]),
    ).toThrow("Seed group users.dev cannot depend on itself");
  });

  it("rejects dependency cycles", () => {
    expect(() =>
      orderSeedMetadata([
        metadata("products.dev", ["users.dev"]),
        metadata("users.dev", ["products.dev"]),
      ]),
    ).toThrow("Seed dependency cycle detected: products.dev, users.dev");
  });

  it("uses lexical IDs as deterministic topological tie breaking", () => {
    const input = [
      metadata("z-independent"),
      metadata("products.dev", ["users.dev"]),
      metadata("a-independent"),
      metadata("users.dev"),
    ];

    expect(orderSeedMetadata(input).map(({ id }) => id)).toEqual([
      "a-independent",
      "users.dev",
      "products.dev",
      "z-independent",
    ]);
    expect(orderSeedMetadata([...input].reverse()).map(({ id }) => id)).toEqual(
      ["a-independent", "users.dev", "products.dev", "z-independent"],
    );
  });
});
