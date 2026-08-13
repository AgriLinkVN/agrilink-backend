import {
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
} from "./seed-contract";
import { SeedOrchestrator } from "./seed-orchestrator";

function group(
  id: string,
  classification: SeedClassification,
  execute: jest.Mock<Promise<void>, [SeedExecutionContext]>,
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
    const referenceExecute = jest
      .fn<Promise<void>, [SeedExecutionContext]>()
      .mockResolvedValue();
    const devExecute = jest
      .fn<Promise<void>, [SeedExecutionContext]>()
      .mockResolvedValue();
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
    expect(devExecute).toHaveBeenCalledWith({
      nodeEnv: "development",
      databaseName: "agrilink_persistence_test_orchestrator",
      classifications: [SeedClassification.DEV],
    });
    expect(referenceExecute).not.toHaveBeenCalled();
  });

  it("passes one normalized verified context while preserving DAG order", async () => {
    const calls: string[] = [];
    const referenceExecute = jest.fn(async (_context: SeedExecutionContext) => {
      calls.push("reference");
    });
    const devExecute = jest.fn(async (_context: SeedExecutionContext) => {
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
        classifications: [
          SeedClassification.REFERENCE,
          SeedClassification.DEV,
          SeedClassification.REFERENCE,
        ],
      }),
    ).resolves.toEqual(["products.reference", "products.dev"]);

    expect(calls).toEqual(["reference", "dev"]);
    const verifiedContext = referenceExecute.mock.calls[0][0];
    expect(verifiedContext).toEqual({
      nodeEnv: "development",
      databaseName: "agrilink_persistence_test_orchestrator",
      classifications: [SeedClassification.DEV, SeedClassification.REFERENCE],
    });
    expect(devExecute.mock.calls[0][0]).toBe(verifiedContext);
  });

  it("runs TEST groups only for an explicit test target", async () => {
    const testExecute = jest
      .fn<Promise<void>, [SeedExecutionContext]>()
      .mockResolvedValue();
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
    expect(testExecute).toHaveBeenCalledWith({
      nodeEnv: "test",
      databaseName: "agrilink_persistence_test_orchestrator_test",
      classifications: [SeedClassification.TEST],
    });
  });
});
