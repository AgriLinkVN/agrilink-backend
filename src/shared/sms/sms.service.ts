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

      const payload = {
        ApiKey: apiKey,
        SecretKey: secretKey,
        Phone: cleanPhone,
        Content: `Ma xac thuc AgriLink cua ban la: ${otpCode}. Ma co hieu luc trong 5 phut.`,
        SmsType: "2",
        IsUnicode: "0",
      };

      const url = 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post/';

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

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
