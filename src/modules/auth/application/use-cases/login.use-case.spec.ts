import { UserRole, UserStatus } from '../../../../common/enums';
import {
  InvalidCredentialsError,
  InvalidLoginIdentifierError,
} from '../../domain/errors/auth.errors';
import { IPasswordHasherPort } from '../ports/outbound/password-hasher.port';
import {
  ITokenGeneratorPort,
  TokenPair,
} from '../ports/outbound/token-generator.port';
import {
  AuthUserAccount,
  IUserManagerPort,
} from '../ports/outbound/user-manager.port';
import { LoginUseCase } from './login.use-case';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TOKENS: TokenPair = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};
const INVALID_CREDENTIALS =
  'Email, số điện thoại hoặc mật khẩu không chính xác';

function makeUser(): AuthUserAccount {
  return {
    id: USER_ID,
    phone: '+84901234567',
    firebaseUid: null,
    email: 'user@example.com',
    passwordHash: 'stored-password-hash',
    role: UserRole.FARMER,
    status: UserStatus.ACTIVE,
    avatarUrl: null,
    fullName: 'Auth Test User',
    isPhoneVerified: true,
    isEmailVerified: true,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('LoginUseCase', () => {
  const userManager: jest.Mocked<IUserManagerPort> = {
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    findByFirebaseUid: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateInternal: jest.fn(),
  };
  const passwordHasher: jest.Mocked<IPasswordHasherPort> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const tokenGenerator: jest.Mocked<ITokenGeneratorPort> = {
    generateTokens: jest.fn(),
    verifyRefreshToken: jest.fn(),
    rotateRefreshToken: jest.fn(),
    revokeAllUserTokens: jest.fn(),
    purgeRetiredTokens: jest.fn(),
  };
  const useCase = new LoginUseCase(
    userManager,
    passwordHasher,
    tokenGenerator,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    userManager.findByEmail.mockResolvedValue(makeUser());
    userManager.findByPhone.mockResolvedValue(makeUser());
    userManager.updateInternal.mockResolvedValue(undefined);
    passwordHasher.compare.mockResolvedValue(true);
    tokenGenerator.generateTokens.mockResolvedValue(TOKENS);
  });

  it('logs in by email with one user lookup', async () => {
    await expect(
      useCase.execute({
        email: 'user@example.com',
        password: 'Str0ngP@ss!',
      }),
    ).resolves.toEqual(TOKENS);

    expect(userManager.findByEmail).toHaveBeenCalledTimes(1);
    expect(userManager.findByEmail).toHaveBeenCalledWith('user@example.com');
    expect(userManager.findByPhone).not.toHaveBeenCalled();
  });

  it('normalizes phone and performs one phone lookup', async () => {
    await expect(
      useCase.execute({
        phone: '0901-234-567',
        password: 'Str0ngP@ss!',
      }),
    ).resolves.toEqual(TOKENS);

    expect(userManager.findByPhone).toHaveBeenCalledTimes(1);
    expect(userManager.findByPhone).toHaveBeenCalledWith('+84901234567');
    expect(userManager.findByEmail).not.toHaveBeenCalled();
  });

  it('returns the same credentials error for an unknown identifier', async () => {
    userManager.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: 'unknown@example.com',
        password: 'Str0ngP@ss!',
      }),
    ).rejects.toMatchObject({
      name: InvalidCredentialsError.name,
      message: INVALID_CREDENTIALS,
    });

    expect(passwordHasher.compare).not.toHaveBeenCalled();
    expect(tokenGenerator.generateTokens).not.toHaveBeenCalled();
  });

  it('returns the same credentials error for a wrong password', async () => {
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({
        phone: '+84901234567',
        password: 'wrong-password',
      }),
    ).rejects.toMatchObject({
      name: InvalidCredentialsError.name,
      message: INVALID_CREDENTIALS,
    });

    expect(tokenGenerator.generateTokens).not.toHaveBeenCalled();
  });

  it('rejects a locked account without issuing tokens', async () => {
    userManager.findByEmail.mockResolvedValue({
      ...makeUser(),
      status: UserStatus.LOCKED,
    });

    await expect(
      useCase.execute({
        email: 'user@example.com',
        password: 'Str0ngP@ss!',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(passwordHasher.compare).not.toHaveBeenCalled();
    expect(tokenGenerator.generateTokens).not.toHaveBeenCalled();
  });

  it('preserves pending-verification login semantics', async () => {
    userManager.findByEmail.mockResolvedValue({
      ...makeUser(),
      status: UserStatus.PENDING_VERIFICATION,
    });

    await expect(
      useCase.execute({
        email: 'user@example.com',
        password: 'Str0ngP@ss!',
      }),
    ).resolves.toEqual(TOKENS);
  });

  it('updates lastLoginAt before generating tokens', async () => {
    await useCase.execute({
      email: 'user@example.com',
      password: 'Str0ngP@ss!',
    });

    expect(userManager.updateInternal).toHaveBeenCalledWith(USER_ID, {
      lastLoginAt: expect.any(Date),
    });
    expect(
      userManager.updateInternal.mock.invocationCallOrder[0],
    ).toBeLessThan(tokenGenerator.generateTokens.mock.invocationCallOrder[0]);
  });

  it.each([
    {
      name: 'both identifiers',
      dto: {
        email: 'user@example.com',
        phone: '+84901234567',
        password: 'Str0ngP@ss!',
      },
    },
    {
      name: 'neither identifier',
      dto: { password: 'Str0ngP@ss!' },
    },
  ])('rejects $name before querying users', async ({ dto }) => {
    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      InvalidLoginIdentifierError,
    );
    expect(userManager.findByEmail).not.toHaveBeenCalled();
    expect(userManager.findByPhone).not.toHaveBeenCalled();
  });

  it('rejects an invalid phone before querying users', async () => {
    await expect(
      useCase.execute({
        phone: '0123',
        password: 'Str0ngP@ss!',
      }),
    ).rejects.toBeInstanceOf(InvalidLoginIdentifierError);
    expect(userManager.findByPhone).not.toHaveBeenCalled();
  });
});
