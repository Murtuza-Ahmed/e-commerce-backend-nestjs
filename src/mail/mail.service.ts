import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { OtpPurpose } from '../otp/entities/otp.entity';

/**
 * Email service (OTP bhejta hai).
 * SMTP_* env set hon to asli email jata hai (Gmail/Resend/SES — koi bhi
 * SMTP provider chalega). Na ho to DEV MODE: OTP console par print hota hai
 * taake local testing na ruke. Production me SMTP lagana LAZMI hai.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from =
      config.get<string>('SMTP_FROM') ?? 'Al-ucaaz <no-reply@al-ucaaz.com>';

    if (host) {
      const port = config.get<number>('SMTP_PORT') ?? 587;
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user: config.get<string>('SMTP_USER'),
          pass: config.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log(
        `SMTP configured (${host}:${port}) — asli emails jayengi.`,
      );
    } else {
      this.logger.warn(
        'SMTP_HOST set nahi — DEV MODE: OTP emails console par print hongi. Production me SMTP lagana lazmi hai.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  private subjectFor(purpose: OtpPurpose): string {
    switch (purpose) {
      case 'email_verification':
        return 'Al-ucaaz — apna email verify karen';
      case 'password_reset':
        return 'Al-ucaaz — password reset code';
      case 'email_recovery':
        return 'Al-ucaaz — account recovery code';
    }
  }

  async sendOtpEmail(
    to: string,
    code: string,
    purpose: OtpPurpose,
    ttlMinutes: number,
  ): Promise<void> {
    if (!this.transporter) {
      // DEV MODE — production me ye line kabhi nahi chalegi (SMTP hoga)
      this.logger.warn(
        `[DEV-MAIL] To: ${to} | Purpose: ${purpose} | OTP: ${code} (valid ${ttlMinutes} min)`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: this.subjectFor(purpose),
      text: `Apka verification code: ${code}\nYe code ${ttlMinutes} minute ke liye valid hai. Kisi se share na karen.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Al-ucaaz</h2>
          <p>Apka verification code:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</p>
          <p>Ye code <strong>${ttlMinutes} minute</strong> ke liye valid hai. Kisi se share na karen.</p>
        </div>`,
    });
  }
}
