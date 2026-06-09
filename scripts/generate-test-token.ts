/**
 * Script tạo JWT test token cho từng role để test API qua Swagger.
 * Chạy: npx ts-node -r tsconfig-paths/register scripts/generate-test-token.ts
 *
 * ⚠️  CHỈ DÙNG CHO MÔI TRƯỜNG DEV — không commit token vào repo.
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { User } from '../src/database/entities/user.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME ?? 'agrilink_db',
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? '',
  entities: [User],
  synchronize: false,
  logging: false,
});

async function main() {
  await AppDataSource.initialize();

  const repo = AppDataSource.getRepository(User);
  const users = await repo.find({ order: { role: 'ASC' } });

  if (users.length === 0) {
    console.error('❌ Không tìm thấy user nào. Hãy chạy `npm run seed` trước.');
    process.exit(1);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('❌ JWT_SECRET không tìm thấy trong .env');
    process.exit(1);
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('  JWT TEST TOKENS (hết hạn sau 24h)');
  console.log('══════════════════════════════════════════════════\n');

  for (const user of users) {
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      // sellerType dựa vào role (farmer/cooperative/supplier là seller)
      sellerType: ['farmer', 'cooperative', 'supplier'].includes(user.role)
        ? user.role
        : undefined,
    };

    const token = jwt.sign(payload, secret, { expiresIn: '24h' });

    console.log(`🔑 [${user.role.toUpperCase()}] - ${user.fullName}`);
    console.log(`   Phone : ${user.phone}`);
    console.log(`   UserID: ${user.id}`);
    console.log(`   Token :\n   ${token}`);
    console.log('');
  }

  console.log('══════════════════════════════════════════════════');
  console.log('  Paste token vào Swagger: http://localhost:3001/api/docs');
  console.log('  Authorize → Bearer <token>');
  console.log('══════════════════════════════════════════════════\n');

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
