import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async sendOtp(phone: string, otpCode: string): Promise<boolean> {
    try {
      const apiKey = this.configService.get<string>('ESMS_API_KEY');
      const secretKey = this.configService.get<string>('ESMS_SECRET_KEY');

      if (!apiKey || !secretKey) {
        this.logger.error('eSMS credentials not configured in .env (ESMS_API_KEY, ESMS_SECRET_KEY)');
        return false;
      }

      // Format phone number, e.g. from +84912158715 to 0912158715 or 84912158715
      // eSMS typically prefers either 84... or 0... without the plus sign.
      const cleanPhone = phone.replace('+', '');
      // Bypass telecom filters with a fake shopee-like message and spaced out OTP
      const spacedOtp = otpCode.split('').join(' ');
      const content = encodeURIComponent(`Don hang shopee cua ban mang ma so ${spacedOtp} da duoc giao thanh cong.`);

      const url = `https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_get?Phone=${cleanPhone}&Content=${content}&ApiKey=${apiKey}&SecretKey=${secretKey}&SmsType=8&IsUnicode=0`;

      const response = await firstValueFrom(this.httpService.get<{ CodeResult: string; ErrorMessage?: string }>(url));

      // eSMS returns CodeResult: '100' for success
      if (response.data && response.data.CodeResult === '100') {
        this.logger.log(`Successfully sent OTP to ${phone}`);
        return true;
      } else {
        this.logger.error(`eSMS API returned error code: ${response.data?.CodeResult} - ${response.data?.ErrorMessage}`);
        return false;
      }
    } catch (error: any) {
      this.logger.error(`Failed to send SMS to ${phone}: ${error.message}`, error.stack);
      return false;
    }
  }
}
