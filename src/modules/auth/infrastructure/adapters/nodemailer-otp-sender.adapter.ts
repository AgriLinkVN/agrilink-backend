import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import {
  IOtpSenderPort,
  NewOtpRecord,
  OtpRecord,
} from "../../application/ports/outbound/otp-sender.port";
import { MailService } from "../../../../shared/mail/mail.service";
import { OtpPurpose } from '../../../../common/enums';
import { OtpVerification } from '../persistence/entities/otp-verification.entity';

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

  async saveOtp(data: NewOtpRecord): Promise<OtpRecord> {
    return this.otpRepo.save(data);
  }

  async sendEmail(email: string, otpCode: string): Promise<boolean> {
    const success = await this.mailService.sendOtpEmail(email, otpCode);
    if (!success) {
      console.warn("[OTP] Mail delivery failed after the OTP was persisted.");
    }
    return success;
  }

  async sendSms(_phone: string, _otpCode: string): Promise<boolean> {
    console.info("[OTP] Mock SMS delivery completed.");
    return true;
  }

  async consumeValidOtp(
    target: string,
    code: string,
    purpose: OtpPurpose,
    now: Date,
  ): Promise<OtpRecord | null> {
    const candidate = await this.otpRepo.findOne({
      where: {
        email: target,
        otpCode: code,
        purpose,
        isUsed: false,
        expiresAt: MoreThan(now),
      },
      order: { createdAt: "DESC" },
    });
    if (!candidate) return null;

    const consumed = await this.otpRepo
      .createQueryBuilder()
      .update(OtpVerification)
      .set({ isUsed: true })
      .where("id = :id", { id: candidate.id })
      .andWhere("is_used = false")
      .andWhere("expires_at > :now", { now })
      .execute();
    if (consumed.affected !== 1) return null;

    return { ...candidate, isUsed: true };
  }

  async purgeRetiredOtps(cutoff: Date, now: Date): Promise<number> {
    const result = await this.otpRepo
      .createQueryBuilder()
      .delete()
      .where("created_at < :cutoff", { cutoff })
      .andWhere("(is_used = true OR expires_at < :now)", { now })
      .execute();
    return result.affected ?? 0;
  }
}
