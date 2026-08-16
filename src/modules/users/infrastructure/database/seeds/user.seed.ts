import * as bcrypt from "bcryptjs";
import { UserRole, UserStatus } from "@common/enums";
import { DataSource, Repository } from "typeorm";
import {
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
  SeedGroupResult,
  SeedOutputBinding,
} from "../../../../../database/seeds/framework/seed-contract";
import { User } from "../../persistence/entities/user.entity";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from "../../../application/contracts/user-seed-output.contract";

export {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from "../../../application/contracts/user-seed-output.contract";

const DECLARED_DEV_PASSWORD = "demo123";

export interface UserDevSeedData {
  readonly phone: string;
  readonly email: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly fullName: string;
  readonly isPhoneVerified: boolean;
  readonly isEmailVerified: boolean;
}

export const userDevSeedData: readonly UserDevSeedData[] = [
  {
    phone: "+84901111099",
    email: "admin@agrilink.vn",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    fullName: "Quản trị viên Hệ thống",
    isPhoneVerified: true,
    isEmailVerified: true,
  },
  {
    phone: "+84901111001",
    email: "farmer@agrilink.vn",
    role: UserRole.FARMER,
    status: UserStatus.ACTIVE,
    fullName: "Nông dân Nguyễn Văn Ruộng",
    isPhoneVerified: true,
    isEmailVerified: true,
  },
  {
    phone: "+84901111002",
    email: "cooperative@agrilink.vn",
    role: UserRole.COOPERATIVE,
    status: UserStatus.ACTIVE,
    fullName: "Hợp tác xã Nông nghiệp Xanh",
    isPhoneVerified: true,
    isEmailVerified: true,
  },
  {
    phone: "+84901111003",
    email: "buyer@agrilink.vn",
    role: UserRole.BUYER,
    status: UserStatus.ACTIVE,
    fullName: "Người mua Trần Thị Thu Mua",
    isPhoneVerified: true,
    isEmailVerified: true,
  },
  {
    phone: "+84901111004",
    email: "enterprise@agrilink.vn",
    role: UserRole.ENTERPRISE,
    status: UserStatus.ACTIVE,
    fullName: "Doanh nghiệp Nông sản Việt",
    isPhoneVerified: true,
    isEmailVerified: true,
  },
  {
    phone: "+84901111005",
    email: "supplier@agrilink.vn",
    role: UserRole.SUPPLIER,
    status: UserStatus.ACTIVE,
    fullName: "Nhà cung cấp Vật tư An Dân",
    isPhoneVerified: true,
    isEmailVerified: true,
  },
  {
    phone: "+84901111007",
    email: "logistics@agrilink.vn",
    role: UserRole.LOGISTICS,
    status: UserStatus.ACTIVE,
    fullName: "Logistics Giao hàng nhanh",
    isPhoneVerified: true,
    isEmailVerified: true,
  },
  {
    phone: "+84905602427",
    email: "farmer@sandbox.com",
    role: UserRole.FARMER,
    status: UserStatus.ACTIVE,
    fullName: "Nguyễn Văn Nông",
    isPhoneVerified: true,
    isEmailVerified: true,
  },
  {
    phone: "+84902372975",
    email: "cooperative@sandbox.com",
    role: UserRole.COOPERATIVE,
    status: UserStatus.ACTIVE,
    fullName: "HTX Nông nghiệp Xanh Tiền Giang",
    isPhoneVerified: true,
    isEmailVerified: true,
  },
  {
    phone: "+84907658754",
    email: "state_agency@sandbox.com",
    role: UserRole.STATE_AGENCY,
    status: UserStatus.ACTIVE,
    fullName: "Cơ quan Quản lý NN Nông thôn",
    isPhoneVerified: true,
    isEmailVerified: true,
  },
];

export const USERS_DEV_SEED_METADATA: SeedGroupMetadata = {
  id: USERS_DEV_SEED_GROUP_ID,
  owner: "users",
  classification: SeedClassification.DEV,
  dependencies: [],
  description: "Declared Users development accounts",
};

export interface UserDevRecord {
  readonly id: string;
}

export interface UserDevWriteData extends UserDevSeedData {
  readonly passwordHash: string;
}

export interface UserDevSeedWriter {
  findByPhone(phone: string): Promise<UserDevRecord | null>;
  findByEmail(email: string): Promise<UserDevRecord | null>;
  create(data: UserDevWriteData): Promise<UserDevRecord>;
  update(id: string, data: UserDevWriteData): Promise<void>;
}

export interface UserDevPasswordHasher {
  hash(credential: string): Promise<string>;
}

export async function reconcileUserDevSeeds(
  writer: UserDevSeedWriter,
  passwordHash: string,
  records: readonly UserDevSeedData[] = userDevSeedData,
): Promise<readonly SeedOutputBinding[]> {
  const outputs: SeedOutputBinding[] = [];
  for (const record of records) {
    const phoneMatch = await writer.findByPhone(record.phone);
    const emailMatch = await writer.findByEmail(record.email);
    if (phoneMatch && emailMatch && phoneMatch.id !== emailMatch.id) {
      throw new Error(
        `users.dev.users identity conflict for ${record.email}: phone and email resolve to different users`,
      );
    }

    const writeData: UserDevWriteData = { ...record, passwordHash };
    const existing = phoneMatch ?? emailMatch;
    let userId: string;
    if (existing) {
      await writer.update(existing.id, writeData);
      userId = existing.id;
    } else {
      userId = (await writer.create(writeData)).id;
    }
    outputs.push({
      kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
      key: record.email,
      value: userId,
    });
  }
  return outputs;
}

export class UsersDevSeedGroup implements SeedGroup {
  readonly metadata = USERS_DEV_SEED_METADATA;

  constructor(
    private readonly writer: UserDevSeedWriter,
    private readonly passwordHasher: UserDevPasswordHasher,
  ) {}

  async execute(context: SeedExecutionContext): Promise<SeedGroupResult> {
    if (!context.classifications.includes(SeedClassification.DEV)) {
      throw new Error(`${this.metadata.id} requires explicit DEV selection`);
    }

    const passwordHash = await this.passwordHasher.hash(DECLARED_DEV_PASSWORD);
    const outputs = await reconcileUserDevSeeds(this.writer, passwordHash);
    return { outputs };
  }
}

class TypeOrmUserDevSeedWriter implements UserDevSeedWriter {
  constructor(private readonly repository: Repository<User>) {}

  async findByPhone(phone: string): Promise<UserDevRecord | null> {
    return this.repository.findOne({ select: { id: true }, where: { phone } });
  }

  async findByEmail(email: string): Promise<UserDevRecord | null> {
    return this.repository.findOne({ select: { id: true }, where: { email } });
  }

  async create(data: UserDevWriteData): Promise<UserDevRecord> {
    return this.repository.save(this.repository.create(data));
  }

  async update(id: string, data: UserDevWriteData): Promise<void> {
    await this.repository.update(id, data);
  }
}

class BcryptUserDevPasswordHasher implements UserDevPasswordHasher {
  async hash(credential: string): Promise<string> {
    return bcrypt.hash(credential, 10);
  }
}

export function createUsersDevSeedGroup(dataSource: DataSource): SeedGroup {
  return new UsersDevSeedGroup(
    new TypeOrmUserDevSeedWriter(dataSource.getRepository(User)),
    new BcryptUserDevPasswordHasher(),
  );
}
