export const OTP_SENDER_PORT = Symbol('OTP_SENDER_PORT');

export interface IOtpSenderPort {
  countRecentRequests(target: string, since: Date): Promise<number>;
  saveOtp(data: any): Promise<any>;
  sendEmail(email: string, otpCode: string): Promise<boolean>;
  sendSms(phone: string, otpCode: string): Promise<boolean>;
  findValidOtp(target: string, code: string, purpose: string): Promise<any>;
  markAsUsed(otp: any): Promise<void>;
}
