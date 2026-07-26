import { DataSource } from 'typeorm';
import { UserRole, UserStatus } from '../../../common/enums';
import { User } from '../infrastructure/persistence/entities/user.entity';

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
      { phone: '+84900000001' },
      { phone: '+84900000002' },
      { phone: '+84900000003' },
      { email: 'farmer.demo@agrilink.vn' },
      { email: 'coop.demo@agrilink.vn' },
      { email: 'supplier.demo@agrilink.vn' },
    ],
  });

  if (existing.length === 3) {
    console.log('✅ Demo sellers đã được seed trước đó — bỏ qua');
    return {
      farmer: existing.find((u) => u.email === 'farmer.demo@agrilink.vn')!,
      cooperative: existing.find((u) => u.email === 'coop.demo@agrilink.vn')!,
      supplier: existing.find((u) => u.email === 'supplier.demo@agrilink.vn')!,
    };
  }

  const [farmer, cooperative, supplier] = await repo.save([
    {
      phone: '+84900000001',
      email: 'farmer.demo@agrilink.vn',
      passwordHash,
      role: UserRole.FARMER,
      status: UserStatus.ACTIVE,
      fullName: 'Nông dân Demo (Lâm Đồng)',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '+84900000002',
      email: 'coop.demo@agrilink.vn',
      passwordHash,
      role: UserRole.COOPERATIVE,
      status: UserStatus.ACTIVE,
      fullName: 'HTX Demo (Tiền Giang)',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '+84900000003',
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
