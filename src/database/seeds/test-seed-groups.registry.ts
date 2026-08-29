import { DataSource } from "typeorm";
import { createProductsTestCatalogSeedGroup } from "../../modules/products/infrastructure/database/seeds/product-test.seed";
import { createUsersTestIdentitySeedGroup } from "../../modules/users/infrastructure/database/seeds/user-test.seed";
import { SeedGroup } from "./framework/seed-contract";

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
