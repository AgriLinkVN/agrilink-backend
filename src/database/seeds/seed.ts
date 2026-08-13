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

// Entities
import { Province } from "../../modules/geography/entities/province.entity";

// Seeds
import { provinceSeedData } from "./provinces.seed";
import { seedProductCategories } from "../../modules/products/infrastructure/database/seeds/product-category.seed";
import { seedUsers } from "../../modules/users/infrastructure/database/seeds/user.seed";

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

async function seedProvinces(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(Province);
  console.log(`🌱 Seeding ${provinceSeedData.length} tỉnh/thành...`);

  for (const data of provinceSeedData) {
    const existing = await repo.findOne({ where: { code: data.code } });
    if (existing) {
      await repo.update(existing.id, {
        name: data.name,
        nameEn: data.nameEn,
        slug: data.slug,
        region: data.region,
        lat: data.lat,
        lng: data.lng,
      });
      console.log(`  ✓ Cập nhật: [${data.code}] ${data.name}`);
    } else {
      const province = repo.create({
        name: data.name,
        nameEn: data.nameEn,
        code: data.code,
        slug: data.slug,
        region: data.region,
        lat: data.lat,
        lng: data.lng,
      });
      await repo.save(province);
      console.log(`  + Thêm mới: [${data.code}] ${data.name}`);
    }
  }

  const count = await repo.count();
  console.log(`  Tổng tỉnh/thành trong DB: ${count}`);
}

async function runSeed() {
  console.log("🌱 Khởi tạo kết nối DB...");
  await AppDataSource.initialize();
  await assertMigratedSeedSchema(AppDataSource);
  console.log("✅ Kết nối DB thành công\n");

  await seedProductCategories(AppDataSource);
  await seedProvinces(AppDataSource);

  console.log("🌱 Bắt đầu seed người dùng...");
  await seedUsers(AppDataSource);

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
