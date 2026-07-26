import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

import {
  OtpPurpose,
  OtpType,
  UserRole,
  UserStatus,
} from '../../src/common/enums';
import { RefreshTokenUseCase } from '../../src/modules/auth/application/use-cases/refresh-token.use-case';
import { JwtTokenGeneratorAdapter } from '../../src/modules/auth/infrastructure/adapters/jwt-token-generator.adapter';
import { NodemailerOtpSenderAdapter } from '../../src/modules/auth/infrastructure/adapters/nodemailer-otp-sender.adapter';
import { OtpVerification } from '../../src/modules/auth/infrastructure/persistence/entities/otp-verification.entity';
import { RefreshToken } from '../../src/modules/auth/infrastructure/persistence/entities/refresh-token.entity';
import { InvalidTokenError } from '../../src/modules/auth/domain/errors/auth.errors';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TOKEN_ID = '22222222-2222-4222-8222-222222222222';
const OTP_ID = '33333333-3333-4333-8333-333333333333';

describe('Persistence Phase 3 Auth concurrency and retention', () => {
  it('allows exactly one rotation for concurrent refresh attempts', async () => {
    let revoked = false;
    const transactionRepository = {
      findOneBy: jest.fn().mockResolvedValue({
        id: TOKEN_ID,
        userId: USER_ID,
      }),
      update: jest.fn().mockImplementation(async () => {
        if (revoked) return { affected: 0 };
        revoked = true;
        return { affected: 1 };
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const rootRepository = {
      manager: {
        transaction: jest.fn(async (work) =>
          work({ getRepository: () => transactionRepository }),
        ),
      },
    };
    const jwtService = {
      sign: jest
        .fn()
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token'),
      decode: jest.fn().mockReturnValue({ exp: 2_000_000_000 }),
      verify: jest.fn(),
    };
    const config = { get: jest.fn((_key, fallback) => fallback) };
    const identity = {
      findById: jest.fn().mockResolvedValue({
        id: USER_ID,
        phone: '+84901234567',
        role: UserRole.FARMER,
        status: UserStatus.ACTIVE,
      }),
    };
    const adapter = new JwtTokenGeneratorAdapter(
      jwtService as unknown as JwtService,
      config as unknown as ConfigService,
      rootRepository as unknown as Repository<RefreshToken>,
      identity as never,
    );

    const results = await Promise.all([
      adapter.rotateRefreshToken('hash', USER_ID),
      adapter.rotateRefreshToken('hash', USER_ID),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((result) => result === null)).toHaveLength(1);
    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
  });

  it('rejects a revoked, expired, missing, or wrong-owner refresh uniformly', async () => {
    const tokenGenerator = {
      verifyRefreshToken: jest.fn().mockResolvedValue({ sub: USER_ID }),
      rotateRefreshToken: jest.fn().mockResolvedValue(null),
    };
    const useCase = new RefreshTokenUseCase(tokenGenerator as never);

    await expect(
      useCase.execute({ refreshToken: 'opaque-token' }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('allows exactly one concurrent OTP consumption', async () => {
    let consumed = false;
    const candidate = {
      id: OTP_ID,
      userId: null,
      phone: null,
      email: 'redacted@example.invalid',
      otpCode: '000000',
      type: OtpType.EMAIL,
      purpose: OtpPurpose.LOGIN,
      isUsed: false,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    };
    const execute = jest.fn().mockImplementation(async () => {
      if (consumed) return { affected: 0 };
      consumed = true;
      return { affected: 1 };
    });
    const queryBuilder = chain({ execute });
    const repository = {
      findOne: jest.fn().mockResolvedValue(candidate),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const adapter = new NodemailerOtpSenderAdapter(
      repository as unknown as Repository<OtpVerification>,
      { sendOtpEmail: jest.fn() } as never,
    );

    const results = await Promise.all([
      adapter.consumeValidOtp(
        candidate.email,
        candidate.otpCode,
        OtpPurpose.LOGIN,
        new Date(),
      ),
      adapter.consumeValidOtp(
        candidate.email,
        candidate.otpCode,
        OtpPurpose.LOGIN,
        new Date(),
      ),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((result) => result === null)).toHaveLength(1);
    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: candidate.email,
          otpCode: candidate.otpCode,
          purpose: OtpPurpose.LOGIN,
          isUsed: false,
        }),
      }),
    );
  });

  it('retention deletes only old revoked/expired tokens and consumed/expired OTPs', async () => {
    const tokenExecute = jest.fn().mockResolvedValue({ affected: 2 });
    const otpExecute = jest.fn().mockResolvedValue({ affected: 3 });
    const tokenBuilder = chain({ execute: tokenExecute });
    const otpBuilder = chain({ execute: otpExecute });
    const tokenAdapter = new JwtTokenGeneratorAdapter(
      {} as JwtService,
      {} as ConfigService,
      {
        createQueryBuilder: () => tokenBuilder,
      } as unknown as Repository<RefreshToken>,
      {} as never,
    );
    const otpAdapter = new NodemailerOtpSenderAdapter(
      {
        createQueryBuilder: () => otpBuilder,
      } as unknown as Repository<OtpVerification>,
      {} as never,
    );
    const cutoff = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-02-01T00:00:00Z');

    await expect(tokenAdapter.purgeRetiredTokens(cutoff, now)).resolves.toBe(2);
    await expect(otpAdapter.purgeRetiredOtps(cutoff, now)).resolves.toBe(3);
    expect(tokenBuilder.where).toHaveBeenCalledWith(
      'created_at < :cutoff',
      { cutoff },
    );
    expect(tokenBuilder.andWhere).toHaveBeenCalledWith(
      '(revoked_at IS NOT NULL OR expires_at < :now)',
      { now },
    );
    expect(otpBuilder.andWhere).toHaveBeenCalledWith(
      '(is_used = true OR expires_at < :now)',
      { now },
    );
  });
});

function chain({ execute }: { execute: jest.Mock }) {
  const builder = {
    update: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    execute,
  };
  for (const method of ['update', 'set', 'delete', 'where', 'andWhere'] as const) {
    builder[method].mockReturnValue(builder);
  }
  return builder;
}
