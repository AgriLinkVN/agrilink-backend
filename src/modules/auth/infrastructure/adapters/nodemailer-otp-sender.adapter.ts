import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import { OtpVerification } from "../../../../database/entities/otp-verification.entity";
import { IOtpSenderPort } from "../../application/ports/outbound/otp-sender.port";
import { MailService } from "../../../../shared/mail/mail.service";

@Injectable()
export class NodemailerOtpSenderAdapter implements IOtpSenderPort {
  constructor(
    @InjectRepository(OtpVerification)
    private readonly otpRepo: Repository<OtpVerification>,
    private readonly mailService: MailService,
  ) {}

  async countRecentRequests(target: string, since: Date): Promise<number> {
    return this.otpRepo.count({
      where: {
        email: target,
        createdAt: MoreThan(since),
      },
    });
  }

  async saveOtp(data: Partial<OtpVerification>): Promise<OtpVerification> {
    return this.otpRepo.save(data);
  }

  async sendEmail(email: string, otpCode: string): Promise<boolean> {
    const success = await this.mailService.sendOtpEmail(email, otpCode);
    if (!success) {
      console.warn(
        `[OTP] MailService returned false for ${email}, but we saved the OTP.`
      );
      console.log(`[Dev Fallback] Use this OTP to login: ${otpCode}`);
    }
    return success;
  }

  async sendSms(phone: string, otpCode: string): Promise<boolean> {
    console.log(`[Mock SMS] Sent OTP ${otpCode} to ${phone}`);
    return true; // mocked
  }

  async findValidOtp(target: string, code: string, purpose: string): Promise<OtpVerification | null> {
    return this.otpRepo.findOne({
      where: {
        email: target,
        otpCode: code,
        purpose: purpose as any,
        isUsed: false,
      },
      order: { createdAt: "DESC" },
    });
  }

  async markAsUsed(otp: OtpVerification): Promise<void> {
    otp.isUsed = true;
    await this.otpRepo.save(otp);
  }
}
