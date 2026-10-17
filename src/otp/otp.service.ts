import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import { Otp, OtpPurpose } from './entities/otp.entity';
import { generateOtpCode, hmacHex, timingSafeEqualHex } from '../common/crypto';

/**
 * OTP engine — tamam flows (email verify, password reset, email recovery)
 * ek hi jagah se guzarte hain taake expiry/attempts ka rule kahin na toote.
 *
 * - Code 6-digit, crypto-secure; DB me sirf HMAC-SHA256 hash.
 * - Naya OTP issue hote hi purana pending OTP khatam.
 * - Ghalat attempts par counter; limit par block.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly ttlMinutes: number;
  private readonly maxAttempts: number;
  private readonly secret: string;

  constructor(
    @InjectRepository(Otp)
    private readonly otpRepo: Repository<Otp>,
    config: ConfigService,
  ) {
    this.ttlMinutes = config.get<number>('OTP_TTL_MINUTES') ?? 10;
    this.maxAttempts = config.get<number>('OTP_MAX_ATTEMPTS') ?? 5;
    const secret = config.get<string>('OTP_SECRET');
    if (!secret) {
      this.logger.warn(
        'OTP_SECRET set nahi — dev default use ho raha hai. Production me lazmi set karen.',
      );
    }
    this.secret = secret ?? 'dev-otp-secret-change-me';
  }

  get ttl(): number {
    return this.ttlMinutes;
  }

  /**
   * Naya OTP banao, purana pending khatam karo.
   * @returns plain code — caller isay email/SMS karega (ya dev me log).
   */
  async issue(identifier: string, purpose: OtpPurpose): Promise<string> {
    const id = identifier.trim().toLowerCase();

    // Purane pending OTPs saaf — ek waqt me ek hi valid code.
    await this.otpRepo.delete({
      identifier: id,
      purpose,
      consumedAt: IsNull(),
    });

    const code = generateOtpCode();
    const otp = this.otpRepo.create({
      identifier: id,
      purpose,
      codeHash: hmacHex(this.secret, code),
      expiresAt: new Date(Date.now() + this.ttlMinutes * 60_000),
      attempts: 0,
      maxAttempts: this.maxAttempts,
      consumedAt: null,
    });
    await this.otpRepo.save(otp);
    return code;
  }

  /**
   * OTP verify karo. Kamiyab = consume (dobara use nahi ho sakta).
   * Nakam = attempts barhao; had se zyada = block.
   */
  async verify(
    identifier: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<void> {
    const id = identifier.trim().toLowerCase();

    const otp = await this.otpRepo.findOne({
      where: {
        identifier: id,
        purpose,
        consumedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException(
        'Code ghalat ya expire ho gaya hai. Naya code mangwayen.',
      );
    }

    if (otp.attempts >= otp.maxAttempts) {
      throw new ForbiddenException(
        'Bohat zyada ghalat koshishen — naya code mangwayen.',
      );
    }

    const ok = timingSafeEqualHex(
      hmacHex(this.secret, code.trim()),
      otp.codeHash,
    );

    if (!ok) {
      otp.attempts += 1;
      await this.otpRepo.save(otp);
      const left = otp.maxAttempts - otp.attempts;
      throw new BadRequestException(
        left > 0
          ? `Code ghalat hai. ${left} koshish baqi hai.`
          : 'Code ghalat hai. Naya code mangwayen.',
      );
    }

    otp.consumedAt = new Date();
    await this.otpRepo.save(otp);
  }

  /** Cron/cleanup ke liye — purane OTPs saaf karo. */
  async purgeExpired(): Promise<number> {
    const res = await this.otpRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return res.affected ?? 0;
  }
}
