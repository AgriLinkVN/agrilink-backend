import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/send-otp.dto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { OtpVerification } from '../../database/entities/otp-verification.entity';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(OtpVerification)
    private readonly otpRepo: Repository<OtpVerification>,
    private readonly httpService: HttpService,
  ) {}

  async register(dto: RegisterDto): Promise<any> {
    const existing = await this.usersService.findByPhone(dto.phone);
    if (existing) {
      throw new ConflictException('Phone number already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.usersService.create({
      phone: dto.phone,
      email: dto.email,
      passwordHash,
      role: dto.role,
      fullName: dto.fullName,
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.updateInternal(user.id, { lastLoginAt: new Date() });

    return this.generateTokens(user.id);
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<TokenPair> {
    let payload: any;
    try {
      const secret = this.configService.get<string>('JWT_REFRESH_SECRET', 'fallback_refresh_secret_change_me');
      payload = this.jwtService.verify(dto.refreshToken, { secret });
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = await this.hashToken(dto.refreshToken);
    const storedToken = await this.refreshTokenRepo.findOne({
      where: { tokenHash, user: { id: payload.sub } },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    await this.refreshTokenRepo.update(storedToken.id, { revokedAt: new Date() });
    return this.generateTokens(payload.sub);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { user: { id: userId }, revokedAt: IsNull() },
      { revokedAt: new Date() }
    );
  }

  async sendOtp(dto: SendOtpDto): Promise<void> {
    // Rate limit: max 3 requests per 10 mins
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentRequests = await this.otpRepo.count({
      where: {
        phone: dto.target,
        createdAt: MoreThan(tenMinsAgo),
      }
    });

    if (recentRequests >= 3) {
      throw new BadRequestException('Too many OTP requests. Try again later.');
    }

    if (dto.purpose === 'login') {
      const user = await this.usersService.findByPhone(dto.target);
      if (!user) {
        throw new BadRequestException('Tài khoản không tồn tại. Vui lòng đăng ký tài khoản trước.');
      }
    } else if (dto.purpose === 'register') {
      const user = await this.usersService.findByPhone(dto.target);
      if (user) {
        throw new ConflictException('Số điện thoại này đã được đăng ký. Vui lòng đăng nhập.');
      }
    }

    const isDemo = dto.target.startsWith('0901111');
    const otpCode = isDemo ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await this.otpRepo.save({
      phone: dto.target,
      otpCode,
      type: dto.type,
      purpose: dto.purpose,
      expiresAt,
    });

    if (dto.type === 'sms') {
      const apiKey = this.configService.get<string>('ESMS_API_KEY');
      const secretKey = this.configService.get<string>('ESMS_SECRET_KEY');
      const brandname = this.configService.get<string>('ESMS_BRANDNAME', 'Baokim');
      
      // Clean phone number (eSMS prefers no + sign, e.g. 84901234567 or 0901234567)
      const cleanPhone = dto.target.replace('+', '');
      const content = encodeURIComponent(`Ma xac thuc AgriLink cua ban la: ${otpCode}`);
      
      const url = `http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_get?Phone=${cleanPhone}&Content=${content}&ApiKey=${apiKey}&SecretKey=${secretKey}&SmsType=2&Brandname=${brandname}`;

      try {
        const response = await firstValueFrom(this.httpService.get(url));
        console.log(`[eSMS] Sent OTP ${otpCode} to ${dto.target} - Response:`, response.data);
      } catch (error) {
        console.error(`[eSMS Error] Failed to send SMS to ${dto.target}:`, error.message);
        // Do not throw error here to avoid blocking user if SMS gateway is down during dev,
        // but in prod you might want to throw a 503 Service Unavailable.
      }
    } else {
      console.log(`[Mock Email] Sent OTP ${otpCode} to ${dto.target}`);
    }
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<void> {
    const otp = await this.otpRepo.findOne({
      where: { phone: dto.target, otpCode: dto.code, purpose: dto.purpose, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    otp.isUsed = true;
    await this.otpRepo.save(otp);

    if (dto.purpose === 'register') {
      const user = await this.usersService.findByPhone(dto.target);
      if (user) {
        await this.usersService.updateInternal(user.id, { isPhoneVerified: true });
      }
    }
  }

  async loginWithOtp(dto: VerifyOtpDto): Promise<TokenPair> {
    await this.verifyOtp(dto);
    
    const user = await this.usersService.findByPhone(dto.target);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.usersService.updateInternal(user.id, { lastLoginAt: new Date() });
    
    return this.generateTokens(user.id);
  }

  private async generateTokens(userId: string): Promise<TokenPair> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = { sub: userId, phone: user.phone, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET', 'fallback_refresh_secret_change_me');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    
    const refreshToken = this.jwtService.sign(
      payload,
      { secret: refreshSecret, expiresIn: refreshExpiresIn }
    );

    const tokenHash = await this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.refreshTokenRepo.save({
      userId,
      tokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  private async hashToken(token: string): Promise<string> {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
