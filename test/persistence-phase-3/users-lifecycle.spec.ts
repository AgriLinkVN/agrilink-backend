import { UserRole, UserStatus } from '../../src/common/enums';
import { AdminService } from '../../src/modules/admin/admin.service';
import { UsersService } from '../../src/modules/users/users.service';
import { User } from '../../src/modules/users/infrastructure/persistence/entities/user.entity';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';

describe('Persistence Phase 3 Users lifecycle', () => {
  it('uses the canonical repository for identity reads, create and update', async () => {
    const entity = makeUser();
    const repository = {
      findOneBy: jest.fn().mockResolvedValue(entity),
      create: jest.fn((data) => ({ ...entity, ...data })),
      save: jest.fn(async (data) => data),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const service = new UsersService(repository as never);

    await expect(service.findById(USER_ID)).resolves.toMatchObject({
      id: USER_ID,
    });
    await expect(service.findByEmail(entity.email)).resolves.toMatchObject({
      id: USER_ID,
    });
    await expect(service.findByPhone(entity.phone!)).resolves.toMatchObject({
      id: USER_ID,
    });
    await expect(
      service.findByFirebaseUid('firebase-user'),
    ).resolves.toMatchObject({ id: USER_ID });
    await service.updateInternal(USER_ID, { lastLoginAt: new Date() });
    await expect(
      service.create({
        email: 'new@example.invalid',
        passwordHash: 'hash',
        role: UserRole.FARMER,
      }),
    ).resolves.toMatchObject({ email: 'new@example.invalid' });

    expect(repository.findOneBy).toHaveBeenCalledTimes(4);
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('serializes status changes and protects admin accounts', async () => {
    const entity = makeUser();
    const transactionRepository = {
      findOne: jest.fn().mockResolvedValue(entity),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const repository = {
      manager: {
        transaction: jest.fn(async (work) =>
          work({ getRepository: () => transactionRepository }),
        ),
      },
    };
    const service = new UsersService(repository as never);

    await expect(
      service.changeStatus(USER_ID, UserStatus.LOCKED),
    ).resolves.toMatchObject({
      outcome: 'updated',
      previousStatus: UserStatus.ACTIVE,
      status: UserStatus.LOCKED,
    });
    expect(transactionRepository.findOne).toHaveBeenCalledWith({
      where: { id: USER_ID },
      lock: { mode: 'pessimistic_write' },
    });

    transactionRepository.findOne.mockResolvedValueOnce({
      ...entity,
      role: UserRole.ADMIN,
    });
    await expect(
      service.changeStatus(ADMIN_ID, UserStatus.LOCKED),
    ).resolves.toEqual({ outcome: 'protected-admin' });
  });

  it('revokes sessions when Admin locks an account and writes one audit event', async () => {
    const auditRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    const userStatusManager = {
      changeStatus: jest.fn().mockResolvedValue({
        outcome: 'updated',
        userId: USER_ID,
        previousStatus: UserStatus.ACTIVE,
        status: UserStatus.LOCKED,
        account: safeUser({ status: UserStatus.LOCKED }),
      }),
    };
    const sessionRevocation = {
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AdminService(
      {} as never,
      auditRepository as never,
      {} as never,
      {} as never,
      {} as never,
      userStatusManager,
      sessionRevocation,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.toggleUserStatus(USER_ID, ADMIN_ID, UserStatus.LOCKED),
    ).resolves.toMatchObject({ status: UserStatus.LOCKED });
    expect(sessionRevocation.revokeAllForUser).toHaveBeenCalledWith(USER_ID);
    expect(auditRepository.save).toHaveBeenCalledTimes(1);
  });
});

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    phone: '+84901234567',
    firebaseUid: 'firebase-user',
    email: 'user@example.invalid',
    passwordHash: 'hash',
    role: UserRole.FARMER,
    status: UserStatus.ACTIVE,
    avatarUrl: null,
    fullName: 'Test User',
    isPhoneVerified: true,
    isEmailVerified: true,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function safeUser(overrides: Partial<User> = {}) {
  const { passwordHash: _, ...safe } = makeUser(overrides);
  return safe;
}
