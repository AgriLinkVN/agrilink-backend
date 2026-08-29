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
  USERS_TEST_SEED_GROUP_ID,
} from "../../../application/contracts/user-seed-output.contract";

export {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_TEST_SEED_GROUP_ID,
} from "../../../application/contracts/user-seed-output.contract";

export interface UserTestIdentitySeedData {
  readonly email: string;
  readonly phone: null;
  readonly passwordHash: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly fullName: null;
  readonly isPhoneVerified: false;
  readonly isEmailVerified: false;
}

/**
 * Shared seller authority from TF-04 and TF-05. Both Commerce harnesses were
 * introduced together with the same email, role, status, and password hash.
 * Historical fixed UUIDs remain harness-local and are intentionally absent.
 */
export const userTestIdentitySeedData: readonly UserTestIdentitySeedData[] =
  Object.freeze([
    Object.freeze({
      email: "seller@example.test",
      phone: null,
      passwordHash: "x",
      role: UserRole.FARMER,
      status: UserStatus.ACTIVE,
      fullName: null,
      isPhoneVerified: false,
      isEmailVerified: false,
    }),
  ]);

export const USERS_TEST_SEED_METADATA: SeedGroupMetadata = Object.freeze({
  id: USERS_TEST_SEED_GROUP_ID,
  owner: "users",
  classification: SeedClassification.TEST,
  dependencies: Object.freeze([]),
  description: "Reusable Users identities for database-backed TEST harnesses",
});

export interface UserTestIdentityRecord {
  readonly id: string;
}

export type UserTestIdentityWriteData = UserTestIdentitySeedData;

export interface UserTestIdentitySeedWriter {
  findByEmail(email: string): Promise<readonly UserTestIdentityRecord[]>;
  create(data: UserTestIdentityWriteData): Promise<UserTestIdentityRecord>;
  update(id: string, data: UserTestIdentityWriteData): Promise<void>;
}

export async function reconcileUserTestIdentities(
  writer: UserTestIdentitySeedWriter,
  records: readonly UserTestIdentitySeedData[] = userTestIdentitySeedData,
): Promise<readonly SeedOutputBinding[]> {
  const declaredEmails = new Set<string>();
  const preflight: Array<{
    readonly record: UserTestIdentitySeedData;
    readonly matches: readonly UserTestIdentityRecord[];
  }> = [];

  for (const record of records) {
    if (declaredEmails.has(record.email)) {
      throw new Error(
        `${USERS_TEST_SEED_GROUP_ID} declares duplicate User email ${record.email}`,
      );
    }
    declaredEmails.add(record.email);
    const matches = await writer.findByEmail(record.email);
    if (matches.length > 1) {
      throw new Error(
        `${USERS_TEST_SEED_GROUP_ID} found multiple Users for email ${record.email}`,
      );
    }
    preflight.push({ record, matches });
  }

  const outputs: SeedOutputBinding[] = [];
  for (const { record, matches } of preflight) {
    let userId: string;
    if (matches.length === 1) {
      await writer.update(matches[0].id, record);
      userId = matches[0].id;
    } else {
      userId = (await writer.create(record)).id;
    }
    outputs.push({
      kind: USER_ID_BY_EMAIL_OUTPUT_KIND,
      key: record.email,
      value: userId,
    });
  }

  return Object.freeze(outputs.map((output) => Object.freeze(output)));
}

export class UsersTestIdentitySeedGroup implements SeedGroup {
  readonly metadata = USERS_TEST_SEED_METADATA;

  constructor(private readonly writer: UserTestIdentitySeedWriter) {}

  async execute(context: SeedExecutionContext): Promise<SeedGroupResult> {
    if (!context.classifications.includes(SeedClassification.TEST)) {
      throw new Error(`${this.metadata.id} requires explicit TEST selection`);
    }

    return {
      outputs: await reconcileUserTestIdentities(this.writer),
    };
  }
}

class TypeOrmUserTestIdentitySeedWriter implements UserTestIdentitySeedWriter {
  constructor(private readonly repository: Repository<User>) {}

  findByEmail(email: string): Promise<readonly UserTestIdentityRecord[]> {
    return this.repository.find({ select: { id: true }, where: { email } });
  }

  create(data: UserTestIdentityWriteData): Promise<UserTestIdentityRecord> {
    return this.repository.save(this.repository.create(data));
  }

  async update(id: string, data: UserTestIdentityWriteData): Promise<void> {
    await this.repository.update(id, data);
  }
}

export function createUsersTestIdentitySeedGroup(
  dataSource: DataSource,
): SeedGroup {
  return new UsersTestIdentitySeedGroup(
    new TypeOrmUserTestIdentitySeedWriter(dataSource.getRepository(User)),
  );
}
