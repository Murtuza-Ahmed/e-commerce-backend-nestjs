import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OtpService } from './otp.service';

/**
 * Expired OTP rows roz saaf karo — warna `otps` table behti jayegi.
 * Roz raat 3 baje (server time). Sirf expired + purani rows jati hain,
 * valid pending OTPs ko haath nahi lagta.
 */
@Injectable()
export class OtpCleanupService {
  private readonly logger = new Logger(OtpCleanupService.name);

  constructor(private readonly otp: OtpService) {}

  @Cron('0 3 * * *')
  async purgeExpiredOtps(): Promise<void> {
    try {
      const deleted = await this.otp.purgeExpired();
      if (deleted > 0) {
        this.logger.log(`OTP cleanup: ${deleted} expired row(s) deleted.`);
      }
    } catch (error) {
      this.logger.error(`OTP cleanup failed: ${(error as Error).message}`);
    }
  }
}
