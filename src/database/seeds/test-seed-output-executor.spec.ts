import { DataSource } from "typeorm";
import {
  PRODUCT_ID_BY_SKU_OUTPUT_KIND,
  PRODUCTS_TEST_SEED_GROUP_ID,
} from "../../modules/products/application/contracts/product-seed-output.contract";
import { COMMERCE_RICE_PRODUCT_TEST_SKU } from "../../modules/products/infrastructure/database/seeds/product-test.seed";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_TEST_SEED_GROUP_ID,
} from "../../modules/users/application/contracts/user-seed-output.contract";
import { SeedClassification } from "./framework/seed-contract";
import { executeSharedTestIdentitySeedGroupsWithOutputs } from "./test-seed-output-executor";

const SAFE_ENVIRONMENT = Object.freeze({
  NODE_ENV: "test",
  DB_HOST: "localhost",
  DB_NAME: "agrilink_persistence_test_p8_06d_unit",
});

type ActualTargetOptions = {
  readonly type?: string;
  readonly host?: string;
  readonly database?: string;
  readonly url?: string;
};

function createPersistenceDouble(
  actualTarget: ActualTargetOptions = {},
): {
  dataSource: DataSource;
  userRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  productRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
} {
  const options = {
    type: "postgres",
    host: "localhost",
    database: SAFE_ENVIRONMENT.DB_NAME,
    ...actualTarget,
  };
  const userRepository = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((data) => data),
    save: jest.fn().mockResolvedValue({ id: "persisted-seller-id" }),
    update: jest.fn(),
  };
  const productRepository = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((data) => data),
    save: jest.fn().mockResolvedValue({ id: "persisted-product-id" }),
    update: jest.fn(),
  };
  const dataSource = {
    options,
    getRepository: jest
      .fn()
      .mockReturnValueOnce(userRepository)
      .mockReturnValueOnce(productRepository),
  } as unknown as DataSource;
  return { dataSource, userRepository, productRepository };
}

describe("shared TEST identity output execution adapter", () => {
  it("executes the declared Users-to-Products DAG and exposes persisted IDs", async () => {
    const persistence = createPersistenceDouble();

    const result = await executeSharedTestIdentitySeedGroupsWithOutputs(
      persistence.dataSource,
      {
        environment: SAFE_ENVIRONMENT,
        classifications: [SeedClassification.TEST],
      },
    );

    expect(result.executedGroupIds).toEqual([
      USERS_TEST_SEED_GROUP_ID,
      PRODUCTS_TEST_SEED_GROUP_ID,
    ]);
    expect(
      result.outputs.requireString(
        USERS_TEST_SEED_GROUP_ID,
        USER_ID_BY_EMAIL_OUTPUT_KIND,
        "seller@example.test",
      ),
    ).toBe("persisted-seller-id");
    expect(
      result.outputs.requireString(
        PRODUCTS_TEST_SEED_GROUP_ID,
        PRODUCT_ID_BY_SKU_OUTPUT_KIND,
        COMMERCE_RICE_PRODUCT_TEST_SKU,
      ),
    ).toBe("persisted-product-id");
    expect(persistence.productRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ sellerId: "persisted-seller-id" }),
    );
  });

  it("rejects non-TEST selection before obtaining repositories", async () => {
    const persistence = createPersistenceDouble();

    await expect(
      executeSharedTestIdentitySeedGroupsWithOutputs(persistence.dataSource, {
        environment: SAFE_ENVIRONMENT,
        classifications: [SeedClassification.DEV],
      }),
    ).rejects.toThrow("requires explicit TEST-only selection");
    expect(persistence.dataSource.getRepository).not.toHaveBeenCalled();
  });

  it.each([
    ["protected database", { database: "agrilink_db" }],
    [
      "different disposable database",
      { database: "agrilink_persistence_test_p8_06d_other" },
    ],
    ["unauthorized remote host", { host: "db.example.internal" }],
    ["missing database", { database: undefined }],
    ["missing host", { host: undefined }],
    [
      "ambiguous URL and host",
      {
        host: "127.0.0.1",
        url: `postgresql://user:pass@localhost:5432/${SAFE_ENVIRONMENT.DB_NAME}`,
      },
    ],
  ])("rejects a safe request with an actual %s", async (_label, options) => {
    const persistence = createPersistenceDouble(options);

    await expect(
      executeSharedTestIdentitySeedGroupsWithOutputs(persistence.dataSource, {
        environment: SAFE_ENVIRONMENT,
        classifications: [SeedClassification.TEST],
      }),
    ).rejects.toThrow();
    expect(persistence.dataSource.getRepository).not.toHaveBeenCalled();
  });

  it("rejects a request/DataSource host mismatch even when both hosts are allowed", async () => {
    const persistence = createPersistenceDouble({ host: "127.0.0.1" });

    await expect(
      executeSharedTestIdentitySeedGroupsWithOutputs(persistence.dataSource, {
        environment: SAFE_ENVIRONMENT,
        classifications: [SeedClassification.TEST],
      }),
    ).rejects.toThrow("TEST_DATASOURCE_TARGET_MISMATCH");
    expect(persistence.dataSource.getRepository).not.toHaveBeenCalled();
  });

  it.each([
    [
      "different database",
      `postgresql://user:pass@localhost:5432/agrilink_persistence_test_p8_06d_url_other`,
      "agrilink_persistence_test_p8_06d_url_other",
    ],
    [
      "remote host",
      `postgresql://user:pass@db.example.internal:5432/${SAFE_ENVIRONMENT.DB_NAME}`,
      SAFE_ENVIRONMENT.DB_NAME,
    ],
  ])(
    "rejects an actual PostgreSQL URL with a %s",
    async (_label, url, database) => {
      const persistence = createPersistenceDouble({
        host: undefined,
        url,
        database,
      });

      await expect(
        executeSharedTestIdentitySeedGroupsWithOutputs(persistence.dataSource, {
          environment: SAFE_ENVIRONMENT,
          classifications: [SeedClassification.TEST],
        }),
      ).rejects.toThrow();
      expect(persistence.dataSource.getRepository).not.toHaveBeenCalled();
    },
  );

  it("rejects an unknown non-PostgreSQL DataSource target", async () => {
    const persistence = createPersistenceDouble({ type: "sqlite" });

    await expect(
      executeSharedTestIdentitySeedGroupsWithOutputs(persistence.dataSource, {
        environment: SAFE_ENVIRONMENT,
        classifications: [SeedClassification.TEST],
      }),
    ).rejects.toThrow("TEST_DATASOURCE_TARGET_UNKNOWN");
    expect(persistence.dataSource.getRepository).not.toHaveBeenCalled();
  });

  it("exposes no undeclared provider outputs", async () => {
    const persistence = createPersistenceDouble();
    const result = await executeSharedTestIdentitySeedGroupsWithOutputs(
      persistence.dataSource,
      {
        environment: SAFE_ENVIRONMENT,
        classifications: [SeedClassification.TEST],
      },
    );

    expect(() =>
      result.outputs.requireString(
        "admin.test.system-configs",
        "system-config.id.by-key",
        "phase1",
      ),
    ).toThrow("UNDECLARED_DEPENDENCY_LOOKUP");
  });
});
