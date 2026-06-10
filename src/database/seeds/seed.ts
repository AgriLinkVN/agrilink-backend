/**
 * Database seed script.
 * Run with: npm run seed
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

// Entities
import { Province } from '../../modules/geography/entities/province.entity';
import { District } from '../../modules/geography/entities/district.entity';
import { ProductCategory } from '../../modules/products/domain/entities/product-category.entity';
import { Product } from '../../modules/products/domain/entities/product.entity';
import { ProductImage } from '../../modules/products/domain/entities/product-image.entity';
import { ProductCertification } from '../../modules/products/domain/entities/product-certification.entity';
import { User } from '../entities/user.entity';

// Seeds
import { provinceSeedData } from './provinces.seed';
import { seedProductCategories } from '../../modules/products/infrastructure/database/seeds/product-category.seed';
import { seedUsers } from '../../modules/users/infrastructure/database/seeds/user.seed';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME ?? 'agrilink_db',
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? '',
  entities: [
    Province,
    District,
    ProductCategory,
    Product,
    ProductImage,
    ProductCertification,
    User,
  ],
  synchronize: true,
  logging: false,
});

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
  console.log('🌱 Khởi tạo kết nối DB...');
  await AppDataSource.initialize();
  console.log('✅ Kết nối DB thành công\n');

  await seedProductCategories(AppDataSource);
  await seedProvinces(AppDataSource);

  console.log('🌱 Bắt đầu seed người dùng...');
  await seedUsers(AppDataSource);

  // Products được seed riêng qua endpoint POST /products/seed (50 mock products)

  await AppDataSource.destroy();
}

runSeed()
  .then(() => {
    console.log('\n🎉 Seed hoàn tất thành công');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Seed thất bại:', err);
    process.exit(1);
  });
