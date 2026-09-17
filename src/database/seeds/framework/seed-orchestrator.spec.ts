import {
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
  SeedGroupResult,
  EMPTY_SEED_GROUP_RESULT,
} from "./seed-contract";
import { SeedOrchestrator } from "./seed-orchestrator";

function group(
  id: string,
  classification: SeedClassification,
  execute: jest.Mock<Promise<SeedGroupResult>, [SeedExecutionContext]>,
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
      .fn<Promise<SeedGroupResult>, [SeedExecutionContext]>()
      .mockResolvedValue(EMPTY_SEED_GROUP_RESULT);
    const devExecute = jest
      .fn<Promise<SeedGroupResult>, [SeedExecutionContext]>()
      .mockResolvedValue(EMPTY_SEED_GROUP_RESULT);
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
    expect(devExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeEnv: "development",
        databaseName: "agrilink_persistence_test_orchestrator",
        classifications: [SeedClassification.DEV],
      }),
    );
    expect(referenceExecute).not.toHaveBeenCalled();
  });

  it("passes one normalized verified context while preserving DAG order", async () => {
    const calls: string[] = [];
    const referenceExecute = jest.fn(async (_context: SeedExecutionContext) => {
      calls.push("reference");
      return EMPTY_SEED_GROUP_RESULT;
    });
    const devExecute = jest.fn(async (_context: SeedExecutionContext) => {
      calls.push("dev");
      return EMPTY_SEED_GROUP_RESULT;
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
    expect(verifiedContext).toEqual(
      expect.objectContaining({
        nodeEnv: "development",
        databaseName: "agrilink_persistence_test_orchestrator",
        classifications: [SeedClassification.DEV, SeedClassification.REFERENCE],
      }),
    );
    expect(devExecute.mock.calls[0][0]).not.toBe(verifiedContext);
  });

  it("runs TEST groups only for an explicit test target", async () => {
    const testExecute = jest
      .fn<Promise<SeedGroupResult>, [SeedExecutionContext]>()
      .mockResolvedValue(EMPTY_SEED_GROUP_RESULT);
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
    expect(testExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeEnv: "test",
        databaseName: "agrilink_persistence_test_orchestrator_test",
        classifications: [SeedClassification.TEST],
      }),
    );
  });

  it("passes declared producer outputs to a dependent group only", async () => {
    const usersExecute = jest
      .fn<Promise<SeedGroupResult>, [SeedExecutionContext]>()
      .mockResolvedValue({
        outputs: [
          {
            kind: "user.id.by-email",
            key: "farmer@agrilink.vn",
            value: "user-123",
          },
        ],
      });
    const received: string[] = [];
    const productsExecute = jest.fn(async (context: SeedExecutionContext) => {
      received.push(
        context.dependencies.requireString(
          "users.dev.users",
          "user.id.by-email",
          "farmer@agrilink.vn",
        ),
      );
      expect(() =>
        context.dependencies.getString("another.group", "record.id", "x"),
      ).toThrow("UNDECLARED_DEPENDENCY_LOOKUP");
      return EMPTY_SEED_GROUP_RESULT;
    });
    const orchestrator = new SeedOrchestrator([
      group(
        "products.dev.test-consumer",
        SeedClassification.DEV,
        productsExecute,
        ["users.dev.users"],
      ),
      group("users.dev.users", SeedClassification.DEV, usersExecute),
    ]);

    await expect(
      orchestrator.execute({
        environment,
        classifications: [SeedClassification.DEV],
      }),
    ).resolves.toEqual(["users.dev.users", "products.dev.test-consumer"]);
    expect(received).toEqual(["user-123"]);
  });
});
