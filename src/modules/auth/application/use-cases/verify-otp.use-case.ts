import { Injectable, Inject } from '@nestjs/common';
import { USER_MANAGER_PORT, IUserManagerPort } from '../ports/outbound/user-manager.port';
import { OTP_SENDER_PORT, IOtpSenderPort } from '../ports/outbound/otp-sender.port';
import { InvalidOtpError } from '../../domain/errors/auth.errors';
import { VerifyOtpDto } from '../../presentation/dto/send-otp.dto';

@Injectable()
export class VerifyOtpUseCase {
  constructor(
    @Inject(USER_MANAGER_PORT) private readonly userManager: IUserManagerPort,
    @Inject(OTP_SENDER_PORT) private readonly otpSender: IOtpSenderPort,
  ) {}

  async execute(dto: VerifyOtpDto): Promise<void> {
    const otp = await this.otpSender.consumeValidOtp(
      dto.target,
      dto.code,
      dto.purpose,
      new Date(),
    );

    if (!otp) {
      throw new InvalidOtpError("Invalid or expired OTP");
    }

    if (dto.purpose === "register") {
      const user = await this.userManager.findByEmail(dto.target);
      if (user) {
        await this.userManager.updateInternal(user.id, {
          isEmailVerified: true,
        });
      }
    }
  }
}
