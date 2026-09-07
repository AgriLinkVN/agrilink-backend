/**
 * Database seed script.
 * Run with: npm run seed
 */

import "reflect-metadata";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";
import { RUNTIME_ENTITY_REGISTRY } from "../entity-registry";
import { createDataSourceOptions } from "../data-source-options";
import { SeedClassification } from "./framework/seed-contract";
import { assertSeedExecutionSafety } from "./framework/seed-environment.guard";
import { SeedOrchestrator } from "./framework/seed-orchestrator";

// Seeds
import { createGeographyProvinceReferenceSeedGroup } from "../../modules/geography/infrastructure/seeds/province-reference.seed";
import { createAdsPackageReferenceSeedGroup } from "../../modules/ads/infrastructure/persistence/seeds/ad-package-reference.seed";
import { createProductsCategoryReferenceSeedGroup } from "../../modules/products/infrastructure/database/seeds/product-category.seed";
import { createUsersDevSeedGroup } from "../../modules/users/infrastructure/database/seeds/user.seed";

dotenv.config();

assertSeedExecutionSafety({
  environment: process.env,
  classifications: [SeedClassification.REFERENCE, SeedClassification.DEV],
});

const AppDataSource = new DataSource(
  createDataSourceOptions(process.env, {
    entities: RUNTIME_ENTITY_REGISTRY,
    logging: false,
  }),
);

const REQUIRED_SEED_TABLES = [
  "ad_packages",
  "districts",
  "product_categories",
  "product_certifications",
  "product_images",
  "products",
  "provinces",
  "users",
] as const;

async function assertMigratedSeedSchema(ds: DataSource): Promise<void> {
  const rows = (await ds.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = ANY($1::text[])
    `,
    [REQUIRED_SEED_TABLES],
  )) as Array<{ table_name: string }>;
  const present = new Set(rows.map(({ table_name }) => table_name));
  const missing = REQUIRED_SEED_TABLES.filter((table) => !present.has(table));
  if (missing.length > 0) {
    throw new Error(
      `Seed requires a migrated database; missing tables: ${missing.join(", ")}`,
    );
  }
}

async function runSeed() {
  console.log("🌱 Khởi tạo kết nối DB...");
  await AppDataSource.initialize();
  await assertMigratedSeedSchema(AppDataSource);
  console.log("✅ Kết nối DB thành công\n");

  const seedOrchestrator = new SeedOrchestrator([
    createAdsPackageReferenceSeedGroup(AppDataSource),
    createGeographyProvinceReferenceSeedGroup(AppDataSource),
    createProductsCategoryReferenceSeedGroup(AppDataSource),
    createUsersDevSeedGroup(AppDataSource),
  ]);
  await seedOrchestrator.execute({
    environment: process.env,
    classifications: [SeedClassification.REFERENCE, SeedClassification.DEV],
  });

  // Products được seed riêng qua endpoint POST /products/seed (50 mock products)

  await AppDataSource.destroy();
}

runSeed()
  .then(() => {
    console.log("\n🎉 Seed hoàn tất thành công");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Seed thất bại:", err);
    process.exit(1);
  });
