import { readFileSync } from "fs";
import { join } from "path";
import { DataSource } from "typeorm";
import { SeedClassification } from "./framework/seed-contract";
import {
  buildSeedExecutionPlan,
  orderSeedMetadata,
} from "./framework/seed-metadata";
import {
  createCleanV2OwnerTestSeedGroups,
  createPhaseEightTestSeedGroups,
  createSharedTestIdentitySeedGroups,
} from "./test-seed-groups.registry";

describe("Phase 8 shared TEST identity registration", () => {
  it("exposes exactly the two approved groups in an acyclic owner order", () => {
    const dataSource = {
      getRepository: jest.fn(() => ({})),
    } as unknown as DataSource;
    const groups = createSharedTestIdentitySeedGroups(dataSource);

    expect(groups.map(({ metadata }) => metadata.id)).toEqual([
      "users.test.identities",
      "products.test.catalog",
    ]);
    expect(new Set(groups.map(({ metadata }) => metadata.id)).size).toBe(2);
    expect(orderSeedMetadata(groups.map(({ metadata }) => metadata))).toEqual(
      groups.map(({ metadata }) => metadata),
    );
    expect(
      buildSeedExecutionPlan(groups, [SeedClassification.TEST]).map(
        ({ metadata }) => metadata.id,
      ),
    ).toEqual(["users.test.identities", "products.test.catalog"]);
    expect(buildSeedExecutionPlan(groups, [SeedClassification.DEV])).toEqual(
      [],
    );
    expect(dataSource.getRepository).toHaveBeenCalledTimes(2);
  });

  it("adds only the Admin system config to the clean-v2 owner subset", () => {
    const dataSource = {
      getRepository: jest.fn(() => ({})),
    } as unknown as DataSource;

    expect(
      createCleanV2OwnerTestSeedGroups(dataSource).map(
        ({ metadata }) => metadata,
      ),
    ).toEqual([
      expect.objectContaining({
        id: "admin.test.system-configs",
        owner: "admin",
        classification: SeedClassification.TEST,
        dependencies: [],
      }),
    ]);
    expect(dataSource.getRepository).toHaveBeenCalledTimes(1);
  });

  it("keeps all three Phase 8 TEST groups unique and acyclic", () => {
    const dataSource = {
      getRepository: jest.fn(() => ({})),
    } as unknown as DataSource;
    const groups = createPhaseEightTestSeedGroups(dataSource);

    expect(groups).toHaveLength(3);
    expect(new Set(groups.map(({ metadata }) => metadata.id)).size).toBe(3);
    expect(
      orderSeedMetadata(groups.map(({ metadata }) => metadata)).map(
        ({ id }) => id,
      ),
    ).toEqual([
      "admin.test.system-configs",
      "users.test.identities",
      "products.test.catalog",
    ]);
    expect(
      buildSeedExecutionPlan(groups, [SeedClassification.TEST]).map(
        ({ metadata }) => metadata.id,
      ),
    ).toEqual([
      "admin.test.system-configs",
      "users.test.identities",
      "products.test.catalog",
    ]);
  });

  it("keeps TEST groups out of normal startup and the DEV/REFERENCE CLI", () => {
    const mainSource = readFileSync(join(process.cwd(), "src/main.ts"), "utf8");
    const cliSource = readFileSync(
      join(process.cwd(), "src/database/seeds/seed.ts"),
      "utf8",
    );

    for (const source of [mainSource, cliSource]) {
      expect(source).not.toMatch(
        /createSharedTestIdentitySeedGroups|users\.test\.identities|products\.test\.catalog/,
      );
    }
  });

  it("keeps the TEST registry construction database-free", () => {
    const source = readFileSync(
      join(process.cwd(), "src/database/seeds/test-seed-groups.registry.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/\.initialize\s*\(|\.query\s*\(|\.execute\s*\(/);
  });

  it("keeps Products free of cross-owner persistence access and extra providers", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/modules/products/infrastructure/database/seeds/product-test.seed.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(
      /users\/infrastructure|user\.entity|Repository<User>|wishlist|certification|PRODUCTS_DEV_SEED_GROUP_ID|PRODUCTS_CATEGORY_REFERENCE_SEED_GROUP_ID/,
    );
    expect(source).not.toMatch(
      /66666666-6666-4666-8666-666666666666|44444444-4444-4444-8444-444444444444/,
    );
  });
});
