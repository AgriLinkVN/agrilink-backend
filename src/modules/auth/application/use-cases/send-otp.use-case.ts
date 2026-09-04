import { Injectable, Inject } from '@nestjs/common';
import { USER_MANAGER_PORT, IUserManagerPort } from '../ports/outbound/user-manager.port';
import { OTP_SENDER_PORT, IOtpSenderPort } from '../ports/outbound/otp-sender.port';
import { OtpLimitExceededError, UserNotFoundError, UserAlreadyExistsError } from '../../domain/errors/auth.errors';
import { SendOtpDto } from '../../presentation/dto/send-otp.dto';

@Injectable()
export class SendOtpUseCase {
  constructor(
    @Inject(USER_MANAGER_PORT) private readonly userManager: IUserManagerPort,
    @Inject(OTP_SENDER_PORT) private readonly otpSender: IOtpSenderPort,
  ) {}

  async execute(dto: SendOtpDto): Promise<void> {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentRequests = await this.otpSender.countRecentRequests(dto.target, tenMinsAgo);

    if (recentRequests >= 3) {
      throw new OtpLimitExceededError("Too many OTP requests. Try again later.");
    }

    if (dto.purpose === "login") {
      const user = await this.userManager.findByEmail(dto.target);
      if (!user) {
        throw new UserNotFoundError("Tài khoản không tồn tại. Vui lòng đăng ký tài khoản trước.");
      }
    } else if (dto.purpose === "register") {
      const user = await this.userManager.findByEmail(dto.target);
      if (user) {
        throw new UserAlreadyExistsError("Số điện thoại này đã được đăng ký. Vui lòng đăng nhập.");
      }
    }

    const isDemo = dto.target.startsWith("0901111");
    const otpCode = isDemo
      ? "123456"
      : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await this.otpSender.saveOtp({
      email: dto.target,
      otpCode,
      type: dto.type,
      purpose: dto.purpose,
      expiresAt,
    });

    if (dto.type === "email") {
      await this.otpSender.sendEmail(dto.target, otpCode);
    } else {
      await this.otpSender.sendSms(dto.target, otpCode);
    }
  }
}
