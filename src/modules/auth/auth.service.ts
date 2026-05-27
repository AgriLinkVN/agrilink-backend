import { Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/send-otp.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * AuthService — handles all authentication flows.
 * TODO: implement each method.
 */
@Injectable()
export class AuthService {
  /**
   * Register a new user.
   * 1. Validate phone uniqueness
   * 2. Hash password with bcrypt
   * 3. Create user record
   * 4. Send OTP for phone verification
   * 5. Return the created user (without password)
   */
  async register(dto: RegisterDto): Promise<any> {
    throw new Error('TODO: implement AuthService.register()');
  }

  /**
   * Authenticate user with phone + password.
   * Returns access + refresh token pair.
   */
  async login(dto: LoginDto): Promise<TokenPair> {
    throw new Error('TODO: implement AuthService.login()');
  }

  /**
   * Issue a new access token using a valid refresh token.
   */
  async refreshTokens(dto: RefreshTokenDto): Promise<TokenPair> {
    throw new Error('TODO: implement AuthService.refreshTokens()');
  }

  /**
   * Revoke the refresh token (logout).
   */
  async logout(userId: string): Promise<void> {
    throw new Error('TODO: implement AuthService.logout()');
  }

  /**
   * Send an OTP code via SMS or email.
   */
  async sendOtp(dto: SendOtpDto): Promise<void> {
    throw new Error('TODO: implement AuthService.sendOtp()');
  }

  /**
   * Verify an OTP code and mark the user's phone/email as verified.
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<void> {
    throw new Error('TODO: implement AuthService.verifyOtp()');
  }
}
