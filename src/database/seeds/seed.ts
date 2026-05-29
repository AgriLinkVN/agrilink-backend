import 'reflect-metadata';
import dataSource from '../data-source';
import { User } from '../entities/user.entity';
import { UserRole, UserStatus } from '../../common/enums';
import * as bcrypt from 'bcryptjs';

async function runSeed() {
  console.log('Initializing database connection...');
  await dataSource.initialize();
  console.log('Database connection initialized.');

  const userRepository = dataSource.getRepository(User);

  const passwordHash = await bcrypt.hash('password123', 10);

  const demoUsers = [
    {
      phone: '0901111001',
      fullName: 'Nguyễn Văn Hùng',
      role: UserRole.FARMER,
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      passwordHash,
    },
    {
      phone: '0901111002',
      fullName: 'HTX Rau Sạch Lâm Đồng',
      role: UserRole.COOPERATIVE,
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      passwordHash,
    },
    {
      phone: '0901111003',
      fullName: 'Trần Thị Mai',
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      passwordHash,
    },
    {
      phone: '0901111004',
      fullName: 'Công ty CP Thực Phẩm Việt',
      role: UserRole.ENTERPRISE,
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      passwordHash,
    },
    {
      phone: '0901111005',
      fullName: 'Nhà cung cấp Nông Cụ Miền Nam',
      role: UserRole.SUPPLIER,
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      passwordHash,
    },
    {
      phone: '0901111006',
      fullName: 'Sở NN&PTNT Đà Nẵng',
      role: UserRole.STATE_AGENCY,
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      passwordHash,
    },
    {
      phone: '0901111007',
      fullName: 'GHN Express Đà Nẵng',
      role: UserRole.LOGISTICS,
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      passwordHash,
    },
    {
      phone: '0901111099',
      fullName: 'Admin AgriLink',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      passwordHash,
    },
  ];

  console.log('Seeding demo users...');
  for (const userData of demoUsers) {
    const existingUser = await userRepository.findOneBy({ phone: userData.phone });
    if (!existingUser) {
      const user = userRepository.create(userData);
      await userRepository.save(user);
      console.log(`Created user: ${userData.fullName} (${userData.phone})`);
    } else {
      console.log(`User already exists: ${userData.fullName} (${userData.phone})`);
    }
  }

  await dataSource.destroy();
  console.log('Database connection closed.');
}

runSeed()
  .then(() => {
    console.log('Seed completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
