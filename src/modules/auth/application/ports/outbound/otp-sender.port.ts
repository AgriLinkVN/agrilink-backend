import { OtpPurpose, OtpType } from '../../../../../common/enums';

export const OTP_SENDER_PORT = Symbol('OTP_SENDER_PORT');

export interface OtpRecord {
  id: string;
  userId: string | null;
  phone: string | null;
  email: string | null;
  otpCode: string;
  type: OtpType;
  purpose: OtpPurpose;
  isUsed: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface NewOtpRecord {
  userId?: string | null;
  phone?: string | null;
  email?: string | null;
  otpCode: string;
  type: OtpType;
  purpose: OtpPurpose;
  expiresAt: Date;
}

export interface IOtpSenderPort {
  countRecentRequests(target: string, since: Date): Promise<number>;
  saveOtp(data: NewOtpRecord): Promise<OtpRecord>;
  sendEmail(email: string, otpCode: string): Promise<boolean>;
  sendSms(phone: string, otpCode: string): Promise<boolean>;
  consumeValidOtp(
    target: string,
    code: string,
    purpose: OtpPurpose,
    now: Date,
  ): Promise<OtpRecord | null>;
  purgeRetiredOtps(cutoff: Date, now: Date): Promise<number>;
}
