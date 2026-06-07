import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

// Entities
import { ProductCategory } from '../../modules/products/domain/entities/product-category.entity';
import { Product } from '../../modules/products/domain/entities/product.entity';
import { ProductImage } from '../../modules/products/domain/entities/product-image.entity';
import { ProductCertification } from '../../modules/products/domain/entities/product-certification.entity';
import { Province } from '../../modules/geography/entities/province.entity';
import { District } from '../../modules/geography/entities/district.entity';
import { User } from '../../modules/users/entities/user.entity';

// Seeds
import { seedProductCategories } from '../../modules/products/infrastructure/database/seeds/product-category.seed';
import { seedProvinces } from '../../modules/geography/seeds/province.seed';
import { seedSellers } from '../../modules/users/seeds/seller.seed';
import { seedProducts } from '../../modules/products/infrastructure/database/seeds/product.seed';

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
    Province,
    District,
    User,
  ],
  synchronize: true,
  logging: false,
});

async function runSeed() {
  console.log('🌱 Khởi tạo kết nối DB...');
  await AppDataSource.initialize();
  console.log('✅ Kết nối DB thành công');

  await seedProductCategories(AppDataSource);
  await seedProvinces(AppDataSource);
  const sellers = await seedSellers(AppDataSource);
  await seedProducts(AppDataSource, sellers);

  // TODO: admin account (P1), ad packages (P5), system_configs (P1)

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
