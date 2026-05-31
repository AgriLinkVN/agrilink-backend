/**
 * Database seed script.
 * Run with: npm run seed
 *
 * Seeds provinces (34 tỉnh/thành sau sáp nhập 2025).
 * Uses upsert-by-code so the script is idempotent (safe to re-run).
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Province } from '../../modules/geography/entities/province.entity';
import { District } from '../../modules/geography/entities/district.entity';
import { provinceSeedData } from './provinces.seed';

async function createDataSource(): Promise<DataSource> {
  // Load .env manually for standalone script
  const dotenv = await import('dotenv');
  dotenv.config();

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'agrilink_db',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    entities: [Province, District],
    logging: process.env.DB_LOGGING === 'true',
  });

  return ds.initialize();
}

async function seedProvinces(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(Province);

  console.log(`Seeding ${provinceSeedData.length} provinces...`);

  for (const data of provinceSeedData) {
    // Upsert: if code already exists → update, else → insert
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
      console.log(`  ✓ Updated: [${data.code}] ${data.name}`);
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
      console.log(`  + Inserted: [${data.code}] ${data.name}`);
    }
  }

  const count = await repo.count();
  console.log(`\nTotal provinces in DB: ${count}`);
}

async function runSeed() {
  const ds = await createDataSource();

  try {
    // Step 1: Seed provinces
    await seedProvinces(ds);

    // TODO Step 2: Seed a default admin account
    // TODO Step 3: Seed ad packages
    // TODO Step 4: Seed system_configs defaults
  } finally {
    await ds.destroy();
  }
}

runSeed()
  .then(() => {
    console.log('\n✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  });
