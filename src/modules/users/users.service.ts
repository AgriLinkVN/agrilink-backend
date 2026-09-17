import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserRole, UserStatus } from "../../common/enums";
import {
  CreateUserAccount,
  SafeUserAccount,
  UpdateUserAccount,
  UserAccount,
  UserPage,
  UserStatusChangeResult,
  UserSummary,
} from "./domain/models/user-account";
import { UserIdentityReader } from "./application/ports/user-identity-reader.port";
import { UserAccountManager } from "./application/ports/user-account-manager.port";
import {
  UserAdminReader,
  UserStatusManager,
} from "./application/ports/user-admin.port";
import { UserReviewReader } from "./application/ports/user-review.port";
import { User } from "./infrastructure/persistence/entities/user.entity";

@Injectable()
export class UsersService
  implements
    UserIdentityReader,
    UserAccountManager,
    UserAdminReader,
    UserStatusManager,
    UserReviewReader
{
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /** Find a user by their UUID — returns null if not found */
  async findById(id: string): Promise<UserAccount | null> {
    return this.toAccountOrNull(await this.usersRepository.findOneBy({ id }));
  }

  /** Find a user by phone number */
  async findByPhone(phone: string): Promise<UserAccount | null> {
    return this.toAccountOrNull(
      await this.usersRepository.findOneBy({ phone }),
    );
  }

  /** Find a user by email */
  async findByEmail(email: string): Promise<UserAccount | null> {
    return this.toAccountOrNull(
      await this.usersRepository.findOneBy({ email }),
    );
  }

  /** Find a user by Firebase UID */
  async findByFirebaseUid(firebaseUid: string): Promise<UserAccount | null> {
    return this.toAccountOrNull(
      await this.usersRepository.findOneBy({ firebaseUid }),
    );
  }

  /** Return the authenticated user's own profile (strips sensitive fields) */
  async getMe(userId: string): Promise<SafeUserAccount> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    return this.toSafeAccount(user);
  }

  /** Update the authenticated user's own profile */
  async updateMe(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<SafeUserAccount> {
    await this.usersRepository.update(userId, dto);
    return this.getMe(userId);
  }

  /** Mobile onboarding role selection. Never allows privileged roles. */
  async updateMyRole(
    userId: string,
    role: UserRole,
  ): Promise<SafeUserAccount> {
    if (![UserRole.FARMER, UserRole.SUPPLIER, UserRole.BUYER].includes(role)) {
      throw new BadRequestException(
        "Role is not allowed for mobile onboarding",
      );
    }

    await this.usersRepository.update(userId, { role });
    return this.getMe(userId);
  }

  /** Internal method to update system fields */
  async updateInternal(
    userId: string,
    data: UpdateUserAccount,
  ): Promise<void> {
    await this.usersRepository.update(userId, data);
  }

  /** Admin: get any user by id */
  async adminGetUser(id: string): Promise<UserAccount | null> {
    return this.findById(id);
  }

  /** Create a new user */
  async create(userData: CreateUserAccount): Promise<UserAccount> {
    const user = this.usersRepository.create(userData);
    return this.toAccount(await this.usersRepository.save(user));
  }

  async countAll(): Promise<number> {
    return this.usersRepository.count();
  }

  async countByStatus(status: UserStatus): Promise<number> {
    return this.usersRepository.count({ where: { status } });
  }

  async findSummariesByIds(ids: string[]): Promise<UserSummary[]> {
    if (ids.length === 0) return [];
    const users = await this.usersRepository.find({
      select: { id: true, fullName: true },
      where: { id: In(ids) },
    });
    return users.map(({ id, fullName }) => ({ id, fullName }));
  }

  async findReviewEligibility(
    userId: string,
  ): Promise<{ id: string; status: UserStatus } | null> {
    return this.usersRepository.findOne({
      where: { id: userId },
      select: { id: true, status: true },
    });
  }

  async findReviewSummariesByIds(
    ids: string[],
  ): Promise<
    Array<{ id: string; fullName: string | null; avatarUrl: string | null }>
  > {
    if (ids.length === 0) return [];
    return this.usersRepository.find({
      where: { id: In(ids) },
      select: { id: true, fullName: true, avatarUrl: true },
    });
  }

  async list(skip: number, take: number): Promise<UserPage> {
    const [users, total] = await this.usersRepository.findAndCount({
      order: { createdAt: "DESC" },
      skip,
      take,
    });
    return {
      data: users.map((user) => this.toSafeAccount(this.toAccount(user))),
      total,
    };
  }

  async changeStatus(
    userId: string,
    status: UserStatus,
  ): Promise<UserStatusChangeResult> {
    return this.usersRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(User);
      const user = await repository.findOne({
        where: { id: userId },
        lock: { mode: "pessimistic_write" },
      });
      if (!user) return { outcome: "not-found" };
      if (user.role === UserRole.ADMIN) {
        return { outcome: "protected-admin" };
      }

      const previousStatus = user.status;
      if (previousStatus !== status) {
        await repository.update(userId, { status });
      }
      return {
        outcome: "updated",
        userId,
        previousStatus,
        status,
        account: this.toSafeAccount(
          this.toAccount({ ...user, status }),
        ),
      };
    });
  }

  private toAccountOrNull(user: User | null): UserAccount | null {
    return user ? this.toAccount(user) : null;
  }

  private toAccount(user: User): UserAccount {
    return {
      id: user.id,
      phone: user.phone,
      firebaseUid: user.firebaseUid,
      email: user.email ?? null,
      passwordHash: user.passwordHash,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      fullName: user.fullName,
      isPhoneVerified: user.isPhoneVerified,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toSafeAccount(user: UserAccount): SafeUserAccount {
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}
