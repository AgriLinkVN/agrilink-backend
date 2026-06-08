import { DataSource } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { UserRole, UserStatus } from '../../../common/enums';

export interface SeededSellers {
  farmer: User;
  cooperative: User;
  supplier: User;
}

export async function seedSellers(dataSource: DataSource): Promise<SeededSellers> {
  const repo = dataSource.getRepository(User);

  // Bcrypt hash of "Password@123" — sellers demo cho seed
  const passwordHash =
    '$2b$10$KQXJ9YJZ7M0NQqgPzqXk1uYj.f5sB.E1WqXGqJ8Ck.0vJjUgUkXX2';

  const existing = await repo.find({
    where: [
      { phone: '0900000001' },
      { phone: '0900000002' },
      { phone: '0900000003' },
    ],
  });

  if (existing.length === 3) {
    console.log('✅ Demo sellers đã được seed trước đó — bỏ qua');
    return {
      farmer: existing.find((u) => u.phone === '0900000001')!,
      cooperative: existing.find((u) => u.phone === '0900000002')!,
      supplier: existing.find((u) => u.phone === '0900000003')!,
    };
  }

  const [farmer, cooperative, supplier] = await repo.save([
    {
      phone: '0900000001',
      email: 'farmer.demo@agrilink.vn',
      passwordHash,
      role: UserRole.FARMER,
      status: UserStatus.ACTIVE,
      fullName: 'Nông dân Demo (Lâm Đồng)',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '0900000002',
      email: 'coop.demo@agrilink.vn',
      passwordHash,
      role: UserRole.COOPERATIVE,
      status: UserStatus.ACTIVE,
      fullName: 'HTX Demo (Tiền Giang)',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '0900000003',
      email: 'supplier.demo@agrilink.vn',
      passwordHash,
      role: UserRole.SUPPLIER,
      status: UserStatus.ACTIVE,
      fullName: 'Nhà cung cấp Demo (Đắk Lắk)',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  ]);

  console.log('✅ Seed 3 demo sellers (farmer / coop / supplier)');
  return { farmer, cooperative, supplier };
}
