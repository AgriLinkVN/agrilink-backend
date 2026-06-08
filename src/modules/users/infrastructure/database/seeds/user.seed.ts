import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '@modules/users/entities/user.entity';
import { UserRole, UserStatus } from '@common/enums';

export async function seedUsers(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(User);

  // Kiểm tra đã seed chưa
  const count = await repo.count();
  if (count > 0) {
    console.log('✅ Người dùng đã được seed trước đó — bỏ qua');
    return;
  }

  const defaultPassword = 'AgriLink@2026';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(defaultPassword, salt);

  const usersData = [
    {
      phone: '0901234567',
      email: 'admin@agrilink.vn',
      passwordHash,
      role: UserRole.admin,
      status: UserStatus.active,
      fullName: 'Quản trị viên Hệ thống',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '0901234568',
      email: 'farmer@agrilink.vn',
      passwordHash,
      role: UserRole.farmer,
      status: UserStatus.active,
      fullName: 'Nông dân Nguyễn Văn Ruộng',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '0901234569',
      email: 'cooperative@agrilink.vn',
      passwordHash,
      role: UserRole.cooperative,
      status: UserStatus.active,
      fullName: 'Hợp tác xã Nông nghiệp Xanh',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '0901234570',
      email: 'buyer@agrilink.vn',
      passwordHash,
      role: UserRole.buyer,
      status: UserStatus.active,
      fullName: 'Người mua Trần Thị Thu Mua',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '0901234571',
      email: 'enterprise@agrilink.vn',
      passwordHash,
      role: UserRole.enterprise,
      status: UserStatus.active,
      fullName: 'Doanh nghiệp Nông sản Việt',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '0901234572',
      email: 'supplier@agrilink.vn',
      passwordHash,
      role: UserRole.supplier,
      status: UserStatus.active,
      fullName: 'Nhà cung cấp Vật tư An Dân',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '0901234573',
      email: 'state_agency@agrilink.vn',
      passwordHash,
      role: UserRole.state_agency,
      status: UserStatus.active,
      fullName: 'Chi cục Trồng trọt & Bảo vệ Thực vật',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '0901234574',
      email: 'government@agrilink.vn',
      passwordHash,
      role: UserRole.government,
      status: UserStatus.active,
      fullName: 'Sở Nông nghiệp & Phát triển Nông thôn',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  ];

  await repo.save(repo.create(usersData));
  console.log(`✅ Seed thành công ${usersData.length} tài khoản người dùng tương ứng với các vai trò`);
}
