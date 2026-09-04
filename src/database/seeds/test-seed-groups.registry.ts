import { DataSource } from "typeorm";
import { createAdminSystemConfigTestSeedGroup } from "../../modules/admin/infrastructure/database/seeds/system-config-test.seed";
import { createProductsTestCatalogSeedGroup } from "../../modules/products/infrastructure/database/seeds/product-test.seed";
import { createUsersTestIdentitySeedGroup } from "../../modules/users/infrastructure/database/seeds/user-test.seed";
import { SeedGroup } from "./framework/seed-contract";

export type TestSeedRepositoryProvider = Pick<DataSource, "getRepository">;

/**
 * Explicit TEST-only composition boundary. Constructing this registry obtains
 * repository handles but neither initializes a DataSource nor executes groups.
 * Normal application startup and the DEV/REFERENCE CLI do not import it.
 */
export function createSharedTestIdentitySeedGroups(
  dataSource: DataSource,
): readonly SeedGroup[] {
  return Object.freeze([
    createUsersTestIdentitySeedGroup(dataSource),
    createProductsTestCatalogSeedGroup(dataSource),
  ]);
}

/** Clean-v2 executes this subset explicitly inside its guarded transaction. */
export function createCleanV2OwnerTestSeedGroups(
  persistence: TestSeedRepositoryProvider,
): readonly SeedGroup[] {
  return Object.freeze([createAdminSystemConfigTestSeedGroup(persistence)]);
}

/** Complete Phase 8 TEST metadata registry for static DAG validation. */
export function createPhaseEightTestSeedGroups(
  dataSource: DataSource,
): readonly SeedGroup[] {
  return Object.freeze([
    ...createSharedTestIdentitySeedGroups(dataSource),
    ...createCleanV2OwnerTestSeedGroups(dataSource),
  ]);
}
