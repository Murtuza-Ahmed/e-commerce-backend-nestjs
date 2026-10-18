import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { OtpPurpose } from '../otp/entities/otp.entity';

interface OtpCopy {
  subject: string;
  heading: string;
  intro: string;
  note?: string;
}

const OTP_COPY: Record<OtpPurpose, OtpCopy> = {
  email_verification: {
    subject: 'Verify your Al-ucaaz email address',
    heading: 'Verify your email',
    intro:
      'Welcome to Al-ucaaz! Please use the verification code below to confirm your email address and activate your account.',
  },
  password_reset: {
    subject: 'Your Al-ucaaz password reset code',
    heading: 'Reset your password',
    intro:
      'We received a request to reset the password on your Al-ucaaz account. Use the code below to continue.',
    note: "If you didn't request a password reset, you can safely ignore this email — your password will stay as it is.",
  },
  email_recovery: {
    subject: 'Your Al-ucaaz account recovery code',
    heading: 'Recover your account',
    intro:
      'Use the verification code below to recover access to your Al-ucaaz account.',
  },
  email_change: {
    subject: 'Verify your new Al-ucaaz email address',
    heading: 'Confirm your new email',
    intro:
      'You asked to change the email address on your Al-ucaaz account. Use the code below to confirm your new address.',
    note: 'Once confirmed, you will need to sign in again with your new email address.',
  },
};

/**
 * Email service — sends OTP emails with a premium branded template.
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

  /**
   * Premium branded OTP email. Saari styles inline hain taake har email
   * client (Gmail, Outlook, Apple Mail) me ek jaisa render ho.
   */
  private buildOtpHtml(
    copy: OtpCopy,
    code: string,
    ttlMinutes: number,
  ): string {
    return `
<div style="background-color:#f4f4f5;margin:0;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <div style="background-color:#111827;padding:30px 32px;text-align:center;">
      <div style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:6px;">AL-UCAAZ</div>
      <div style="color:#9ca3af;font-size:11px;letter-spacing:3px;margin-top:6px;">PREMIUM CLOTHING</div>
    </div>
    <div style="padding:36px 36px 8px 36px;">
      <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">${copy.heading}</h1>
      <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#4b5563;">${copy.intro}</p>
      <div style="background-color:#f9fafb;border:1px dashed #d1d5db;border-radius:10px;text-align:center;padding:24px 16px;margin:0 0 24px 0;">
        <div style="font-size:13px;color:#6b7280;letter-spacing:2px;margin-bottom:10px;">YOUR VERIFICATION CODE</div>
        <div style="font-size:36px;font-weight:800;letter-spacing:12px;color:#111827;margin-left:12px;">${code}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:10px;">This code expires in <strong>${ttlMinutes} minutes</strong></div>
      </div>
      <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#9ca3af;">
        For your security, never share this code with anyone. Al-ucaaz will never ask for it by phone or message.
      </p>
      ${copy.note ? `<p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#9ca3af;">${copy.note}</p>` : ''}
    </div>
    <div style="padding:20px 36px 28px 36px;border-top:1px solid #f3f4f6;margin-top:20px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        This is an automated message from Al-ucaaz. Please do not reply to this email.
      </p>
    </div>
  </div>
</div>`.trim();
  }

  private buildOtpText(
    copy: OtpCopy,
    code: string,
    ttlMinutes: number,
  ): string {
    const lines = [
      `Al-ucaaz — ${copy.heading}`,
      '',
      copy.intro,
      '',
      `Your verification code: ${code}`,
      `This code expires in ${ttlMinutes} minutes.`,
      '',
      'For your security, never share this code with anyone.',
    ];
    if (copy.note) lines.push('', copy.note);
    return lines.join('\n');
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

    const copy = OTP_COPY[purpose];
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Al-ucaaz — ${copy.subject}`,
      text: this.buildOtpText(copy, code, ttlMinutes),
      html: this.buildOtpHtml(copy, code, ttlMinutes),
    });
  }

  /**
   * Email change ke baad PURANE email par ittila — taake account hijack
   * ki surat me asal malik ko khabar ho jaye.
   */
  async sendEmailChangedNotice(
    oldEmail: string,
    newEmail: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `[DEV-MAIL] To: ${oldEmail} | Notice: email changed to ${newEmail}`,
      );
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to: oldEmail,
      subject: 'Al-ucaaz — Your account email was changed',
      text: [
        'Al-ucaaz — Security notice',
        '',
        `The email address on your Al-ucaaz account was just changed to ${newEmail}.`,
        '',
        'If you made this change, no further action is needed.',
        'If you did NOT make this change, please contact our support team immediately.',
      ].join('\n'),
      html: `
<div style="background-color:#f4f4f5;margin:0;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <div style="background-color:#111827;padding:30px 32px;text-align:center;">
      <div style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:6px;">AL-UCAAZ</div>
      <div style="color:#9ca3af;font-size:11px;letter-spacing:3px;margin-top:6px;">PREMIUM CLOTHING</div>
    </div>
    <div style="padding:36px 36px 8px 36px;">
      <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Your account email was changed</h1>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#4b5563;">
        The email address on your Al-ucaaz account was just changed to <strong>${newEmail}</strong>.
      </p>
      <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#4b5563;">
        If you made this change, no further action is needed.
      </p>
      <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#b91c1c;font-weight:600;">
        If you did NOT make this change, please contact our support team immediately.
      </p>
    </div>
    <div style="padding:20px 36px 28px 36px;border-top:1px solid #f3f4f6;margin-top:20px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        This is an automated security notice from Al-ucaaz. Please do not reply to this email.
      </p>
    </div>
  </div>
</div>`.trim(),
    });
  }
}
