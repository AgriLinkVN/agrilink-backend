import type { OtpVerification } from '@database/entities/otp-verification.entity';

export const OTP_SENDER_PORT = Symbol('OTP_SENDER_PORT');

export interface IOtpSenderPort {
  countRecentRequests(target: string, since: Date): Promise<number>;
  saveOtp(data: Partial<OtpVerification>): Promise<OtpVerification>;
  sendEmail(email: string, otpCode: string): Promise<boolean>;
  sendSms(phone: string, otpCode: string): Promise<boolean>;
  findValidOtp(target: string, code: string, purpose: string): Promise<OtpVerification | null>;
  markAsUsed(otp: OtpVerification): Promise<void>;
}
