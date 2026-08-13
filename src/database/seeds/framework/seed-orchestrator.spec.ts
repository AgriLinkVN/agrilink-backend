import {
  SeedClassification,
  SeedGroup,
  SeedGroupMetadata,
} from "./seed-contract";
import { SeedOrchestrator } from "./seed-orchestrator";

function group(
  id: string,
  classification: SeedClassification,
  execute: jest.Mock<Promise<void>, []>,
  dependencies: readonly string[] = [],
): SeedGroup {
  const metadata: SeedGroupMetadata = {
    id,
    owner: "test-owner",
    classification,
    dependencies,
  };
  return { metadata, execute };
}

describe("SeedOrchestrator classification selection", () => {
  const environment = {
    NODE_ENV: "development",
    DB_NAME: "agrilink_persistence_test_orchestrator",
  };

  it("invokes only explicitly selected classifications", async () => {
    const referenceExecute = jest.fn<Promise<void>, []>().mockResolvedValue();
    const devExecute = jest.fn<Promise<void>, []>().mockResolvedValue();
    const orchestrator = new SeedOrchestrator([
      group(
        "products.reference",
        SeedClassification.REFERENCE,
        referenceExecute,
      ),
      group("products.dev", SeedClassification.DEV, devExecute),
    ]);

    await expect(
      orchestrator.execute({
        environment,
        classifications: [SeedClassification.DEV],
      }),
    ).resolves.toEqual(["products.dev"]);

    expect(devExecute).toHaveBeenCalledTimes(1);
    expect(referenceExecute).not.toHaveBeenCalled();
  });

  it("requires REFERENCE to be explicitly included and preserves DAG order", async () => {
    const calls: string[] = [];
    const referenceExecute = jest.fn(async () => {
      calls.push("reference");
    });
    const devExecute = jest.fn(async () => {
      calls.push("dev");
    });
    const orchestrator = new SeedOrchestrator([
      group("products.dev", SeedClassification.DEV, devExecute, [
        "products.reference",
      ]),
      group(
        "products.reference",
        SeedClassification.REFERENCE,
        referenceExecute,
      ),
    ]);

    await expect(
      orchestrator.execute({
        environment,
        classifications: [SeedClassification.DEV, SeedClassification.REFERENCE],
      }),
    ).resolves.toEqual(["products.reference", "products.dev"]);
    expect(calls).toEqual(["reference", "dev"]);
  });

  it("runs TEST groups only for an explicit test target", async () => {
    const testExecute = jest.fn<Promise<void>, []>().mockResolvedValue();
    const orchestrator = new SeedOrchestrator([
      group("products.test", SeedClassification.TEST, testExecute),
    ]);

    await expect(
      orchestrator.execute({
        environment: {
          NODE_ENV: "test",
          DB_NAME: "agrilink_persistence_test_orchestrator_test",
        },
        classifications: [SeedClassification.TEST],
      }),
    ).resolves.toEqual(["products.test"]);
    expect(testExecute).toHaveBeenCalledTimes(1);
  });
});
