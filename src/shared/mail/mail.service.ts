import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtpEmail(to: string, code: string): Promise<boolean> {
    try {
      const smtpUser = this.configService.get<string>('SMTP_USER');
      if (!smtpUser) {
        this.logger.log(`[MAIL DEV] OTP for ${to}: ${code}`);
        return true;
      }

      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM', 'AgriLink <no-reply@agrilink.vn>'),
        to,
        subject: 'AgriLink — Mã xác nhận',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#2d7a2d">AgriLink</h2>
            <p>Mã xác nhận của bạn là:</p>
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2d7a2d;margin:24px 0">${code}</div>
            <p style="color:#888">Mã có hiệu lực trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này.</p>
          </div>
        `,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }
}
