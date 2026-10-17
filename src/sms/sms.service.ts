import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio';

/**
 * SMS service — forgot-email flow me phone par OTP bhejta hai.
 * TWILIO_* env set hon to asli SMS jata hai, warna DEV MODE me
 * OTP console par print hota hai. Koi aur SMS provider ho to
 * sirf is file ka andaruni hissa badlega, interface same rahega.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: ReturnType<typeof Twilio> | null = null;
  private readonly from: string | undefined;

  constructor(private readonly config: ConfigService) {
    const sid = config.get<string>('TWILIO_ACCOUNT_SID');
    const token = config.get<string>('TWILIO_AUTH_TOKEN');
    this.from = config.get<string>('TWILIO_FROM');

    if (sid && token && this.from) {
      this.client = Twilio(sid, token);
      this.logger.log('Twilio configured — asli SMS jayenge.');
    } else {
      this.logger.warn(
        'TWILIO_* set nahi — DEV MODE: OTP SMS console par print hoga.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async sendOtpSms(
    to: string,
    code: string,
    ttlMinutes: number,
  ): Promise<void> {
    if (!this.client || !this.from) {
      this.logger.warn(
        `[DEV-SMS] To: ${to} | OTP: ${code} (valid ${ttlMinutes} min)`,
      );
      return;
    }

    await this.client.messages.create({
      from: this.from,
      to,
      body: `Al-ucaaz verification code: ${code}. ${ttlMinutes} minute me expire hoga. Kisi se share na karen.`,
    });
  }
}
