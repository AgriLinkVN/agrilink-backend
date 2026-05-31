import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

// Entities
import { ProductCategory } from '../../modules/products/domain/entities/product-category.entity';
import { Product } from '../../modules/products/domain/entities/product.entity';
import { ProductImage } from '../../modules/products/domain/entities/product-image.entity';
import { ProductCertification } from '../../modules/products/domain/entities/product-certification.entity';
import { AdPackage } from '../../modules/ads/entities/ad-package.entity';

// Seeds
import { seedProductCategories } from '../../modules/products/infrastructure/database/seeds/product-category.seed';
import { seedAdPackages } from '../../modules/ads/seeds/ad-package.seed';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME ?? 'agrilink_db',
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? '',
  entities: [
    ProductCategory,
    Product,
    ProductImage,
    ProductCertification,
    AdPackage,         // ← P5: cần để seed gói quảng cáo
  ],
  synchronize: true,
  logging: false,
});

async function runSeed() {
  console.log('🌱 Khởi tạo kết nối DB...');
  await AppDataSource.initialize();
  console.log('✅ Kết nối DB thành công');

  await seedProductCategories(AppDataSource);

  // Step 2: Seed provinces/districts  — TODO (P4 làm)
  // Step 3: Seed admin account        — TODO (P1 làm)

  // Step 4: Seed ad packages — P5
  await seedAdPackages(AppDataSource);

  // Step 5: Seed system_configs       — TODO (P1 làm)

  await AppDataSource.destroy();
}

runSeed()
  .then(() => {
    console.log('🎉 Seed hoàn tất thành công');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seed thất bại:', err);
    process.exit(1);
  });