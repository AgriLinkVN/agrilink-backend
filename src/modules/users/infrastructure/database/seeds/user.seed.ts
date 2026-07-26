import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../persistence/entities/user.entity';
import { UserRole, UserStatus } from '@common/enums';

export async function seedUsers(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(User);

  // Chúng ta sẽ bỏ qua kiểm tra count để đảm bảo các tài khoản demo được seed
  // (Lưu ý: trong thực tế nên kiểm tra kỹ hơn)

  const defaultPassword = 'demo123';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(defaultPassword, salt);

  const usersData = [
    {
      phone: '+84901111099',
      email: 'admin@agrilink.vn',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      fullName: 'Quản trị viên Hệ thống',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '+84901111001',
      email: 'farmer@agrilink.vn',
      passwordHash,
      role: UserRole.FARMER,
      status: UserStatus.ACTIVE,
      fullName: 'Nông dân Nguyễn Văn Ruộng',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '+84901111002',
      email: 'cooperative@agrilink.vn',
      passwordHash,
      role: UserRole.COOPERATIVE,
      status: UserStatus.ACTIVE,
      fullName: 'Hợp tác xã Nông nghiệp Xanh',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '+84901111003',
      email: 'buyer@agrilink.vn',
      passwordHash,
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      fullName: 'Người mua Trần Thị Thu Mua',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '+84901111004',
      email: 'enterprise@agrilink.vn',
      passwordHash,
      role: UserRole.ENTERPRISE,
      status: UserStatus.ACTIVE,
      fullName: 'Doanh nghiệp Nông sản Việt',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '+84901111005',
      email: 'supplier@agrilink.vn',
      passwordHash,
      role: UserRole.SUPPLIER,
      status: UserStatus.ACTIVE,
      fullName: 'Nhà cung cấp Vật tư An Dân',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
    {
      phone: '+84901111007',
      email: 'logistics@agrilink.vn',
      passwordHash,
      role: UserRole.LOGISTICS,
      status: UserStatus.ACTIVE,
      fullName: 'Logistics Giao hàng nhanh',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  ];

  for (const userData of usersData) {
    const existing = await repo.findOne({
      where: [{ phone: userData.phone }, { email: userData.email }],
    });
    if (!existing) {
      await repo.save(repo.create(userData));
    } else {
      // update password for demo users
      await repo.update({ phone: userData.phone }, { passwordHash: userData.passwordHash });
    }
  }

  console.log(`✅ Seed thành công ${usersData.length} tài khoản người dùng tương ứng với các vai trò`);
}
