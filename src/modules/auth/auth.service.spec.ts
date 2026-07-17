import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { OtpVerification } from '../../database/entities/otp-verification.entity';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { OtpType, OtpPurpose } from '../../common/enums';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { SmsService } from '../../shared/sms/sms.service';

describe('AuthService Security Tests', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let otpRepo: any;
  let refreshTokenRepo: any;

  beforeEach(async () => {
    usersService = {
      findByPhone: jest.fn(),
      updateInternal: jest.fn(),
    };

    otpRepo = {
      count: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    refreshTokenRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('mocked') } },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: getRepositoryToken(OtpVerification), useValue: otpRepo },
        { provide: HttpService, useValue: { get: jest.fn().mockReturnValue(of({ data: { CodeResult: 100 } })) } },
        { provide: SmsService, useValue: { sendOtp: jest.fn().mockResolvedValue(true) } },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('SEC-AUTH-03: Login with wrong password (SQLi/Data Injection attempt)', () => {
    it('should throw UnauthorizedException if password does not match', async () => {
      // Mock user found in DB
      usersService.findByPhone.mockResolvedValue({
        id: 'user-1',
        phone: '+84901234567',
        passwordHash: await bcrypt.hash('correct_password', 1),
      } as any);

      // Attempt login with injected/wrong password
      await expect(
        authService.login({
          phone: '+84901234567',
          password: "admin' --", // Typical SQL injection string
        })
      ).rejects.toThrow(UnauthorizedException);
      
      await expect(
        authService.login({
          phone: '+84901234567',
          password: "wrong_password",
        })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('SEC-AUTH-07: Refresh Token reuse / revoked token', () => {
    it('should throw UnauthorizedException if token is already revoked', async () => {
      jest.spyOn(authService as any, 'hashToken').mockResolvedValue('hashed_token');
      
      // Mock token found but revoked
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hashed_token',
        revokedAt: new Date(), // Already revoked!
        expiresAt: new Date(Date.now() + 10000),
      });

      // Jwt verify passes
      const jwtService = authService['jwtService'];
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user-1' });

      await expect(
        authService.refreshTokens({ refreshToken: 'some_old_token' })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('SEC-AUTH-08: OTP Rate Limiting (SMS Bombing)', () => {
    it('should throw BadRequestException if > 3 requests in 10 mins', async () => {
      // Mock that there are already 3 requests
      otpRepo.count.mockResolvedValue(3);

      await expect(
        authService.sendOtp({
          target: '+84901234567',
          type: OtpType.SMS,
          purpose: OtpPurpose.REGISTER,
        })
      ).rejects.toThrow(BadRequestException);
      
      expect(otpRepo.count).toHaveBeenCalledTimes(1);
      expect(otpRepo.save).not.toHaveBeenCalled(); // Should not save a new OTP
    });

    it('should allow sending OTP if < 3 requests in 10 mins', async () => {
      // Mock that there are only 2 requests
      otpRepo.count.mockResolvedValue(2);

      await authService.sendOtp({
        target: '+84901234567',
        type: OtpType.SMS,
        purpose: OtpPurpose.REGISTER,
      });
      
      expect(otpRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('SEC-AUTH-10: Expired OTP verification', () => {
    it('should throw BadRequestException if OTP is expired', async () => {
      // Mock expired OTP
      otpRepo.findOne.mockResolvedValue({
        id: 'otp-1',
        phone: '+84901234567',
        otpCode: '123456',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        isUsed: false,
      });

      await expect(
        authService.verifyOtp({
          target: '+84901234567',
          code: '123456',
          purpose: OtpPurpose.REGISTER,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
