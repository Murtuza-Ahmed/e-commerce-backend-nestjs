import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { UsersService, SafeUser } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { comparePassword, verifyTokenHash } from '../common/crypto';
import { AuthUser } from '../common/decorators';
import {
  ConfirmEmailChangeDto,
  ForgotEmailDto,
  ForgotPasswordDto,
  LoginDto,
  RecoverEmailDto,
  RequestEmailChangeDto,
  ResendOtpDto,
  ResetPasswordDto,
  SignupDto,
  VerifyEmailDto,
} from './dto/auth.dto';

/**
 * "15m" / "3600" dono chalte hain. Plain parseInt("15m") = 15 second
 * ban jata — ye silent bug yahan fix hai.
 */
function parseExpiresIn(
  raw: string | undefined,
  fallback: string,
): JwtSignOptions['expiresIn'] {
  const value = (raw ?? fallback).trim();
  if (/^\d+$/.test(value)) {
    return `${value}s` as JwtSignOptions['expiresIn'];
  }
  return value as JwtSignOptions['expiresIn'];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: SafeUser;
}

/**
 * Tamam auth flows — OTP gate ke sath:
 *  - signup -> email OTP -> verify -> tab login
 *  - login: sirf verified + active users
 *  - refresh: rotation (purana token foran invalid)
 *  - forgot-password: email OTP -> reset (saari sessions logout)
 *  - forgot-email: phone par SMS OTP -> masked email wapas
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: JwtSignOptions['expiresIn'];
  private readonly refreshExpiresIn: JwtSignOptions['expiresIn'];

  constructor(
    private readonly users: UsersService,
    private readonly otp: OtpService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessExpiresIn = parseExpiresIn(
      config.get<string>('JWT_ACCESS_EXPIRES_IN'),
      '15m',
    );
    this.refreshExpiresIn = parseExpiresIn(
      config.get<string>('JWT_REFRESH_EXPIRES_IN'),
      '7d',
    );
  }

  // ---------- signup + email verification ----------

  async signup(dto: SignupDto): Promise<{ message: string; email: string }> {
    const email = dto.email.trim().toLowerCase();

    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Ye email pehle se registered hai.');
    }

    const user = await this.users.createCustomer({
      name: dto.name,
      email,
      phone: dto.phone,
      password: dto.password,
    });

    const code = await this.otp.issue(email, 'email_verification');
    await this.mail.sendOtpEmail(
      email,
      code,
      'email_verification',
      this.otp.ttl,
    );

    this.logger.log(
      `Signup: ${email} (id ${user.id}) — verification OTP bheja.`,
    );
    return {
      message:
        'Account ban gaya. Email par bheja gaya 6-digit code darj karen — verify kiye baghair login nahi hoga.',
      email,
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<TokenPair> {
    const email = dto.email.trim().toLowerCase();
    await this.otp.verify(email, 'email_verification', dto.otp);

    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account nahi mila ya band hai.');
    }
    await this.users.setEmailVerified(user.id);
    this.logger.log(`Email verified: ${email}`);
    return this.issueTokens(user.id);
  }

  async resendOtp(dto: ResendOtpDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);

    // Enumeration se bachne ke liye hamesha same jawab.
    const generic = {
      message: 'Agar ye email registered hai to code bhej diya gaya hai.',
    };
    if (!user || !user.isActive) return generic;
    if (dto.purpose === 'email_verification' && user.emailVerified)
      return generic;

    const code = await this.otp.issue(email, dto.purpose);
    await this.mail.sendOtpEmail(email, code, dto.purpose, this.otp.ttl);
    return generic;
  }

  // ---------- login / refresh / logout ----------

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.users.findByEmailWithSecrets(
      dto.email.trim().toLowerCase(),
    );
    if (!user || !(await comparePassword(dto.password, user.passwordHash))) {
      // Kaunsi cheez ghalat hai, ye nahi batate (enumeration protection).
      throw new UnauthorizedException('Email ya password ghalat hai.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Email ya password ghalat hai.');
    }
    if (!user.emailVerified) {
      throw new ForbiddenException({
        message: 'Email verify nahi hui. Pehle email par aya code darj karen.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    return this.issueTokens(user.id);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: { sub: string; jti?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Session khatam — dobara login karen.');
    }

    const user = await this.users.findByIdWithSecrets(payload.sub);
    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Session khatam — dobara login karen.');
    }

    const ok = await verifyTokenHash(refreshToken, user.refreshTokenHash);
    if (!ok) {
      // Token reuse/shak — session hi khatam karo.
      await this.users.clearRefreshToken(user.id);
      this.logger.warn(
        `Refresh token mismatch (possible reuse) for ${user.email}`,
      );
      throw new UnauthorizedException('Session khatam — dobara login karen.');
    }

    // Rotation: naya pair, purana foran invalid.
    return this.issueTokens(user.id);
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.users.clearRefreshToken(userId);
    return { message: 'Logout ho gaya.' };
  }

  // ---------- forgot / reset password ----------

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const generic = {
      message: 'Agar ye email registered hai to reset code bhej diya gaya hai.',
    };
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) return generic;

    const code = await this.otp.issue(email, 'password_reset');
    await this.mail.sendOtpEmail(email, code, 'password_reset', this.otp.ttl);
    return generic;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    await this.otp.verify(email, 'password_reset', dto.otp);

    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account nahi mila ya band hai.');
    }
    await this.users.setPassword(user.id, dto.newPassword);
    this.logger.log(`Password reset: ${email} (saari sessions logout)`);
    return { message: 'Password reset ho gaya. Naye password se login karen.' };
  }

  // ---------- forgot email (phone par SMS OTP -> masked email) ----------

  async forgotEmail(dto: ForgotEmailDto): Promise<{ message: string }> {
    const phone = dto.phone.trim();
    const generic = {
      message:
        'Agar ye number registered hai to us par verification code bhej diya gaya hai.',
    };
    const user = await this.users.findByPhone(phone);
    if (!user || !user.isActive) return generic;

    const code = await this.otp.issue(phone, 'email_recovery');
    await this.sms.sendOtpSms(phone, code, this.otp.ttl);
    return generic;
  }

  async recoverEmail(dto: RecoverEmailDto): Promise<{ email: string }> {
    const phone = dto.phone.trim();
    await this.otp.verify(phone, 'email_recovery', dto.otp);

    const user = await this.users.findByPhone(phone);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account nahi mila ya band hai.');
    }
    // Poora email nahi — masked (real-world pattern).
    const [local, domain] = user.email.split('@');
    return { email: `${local[0]}***@${domain}` };
  }

  // ---------- email change (logged-in user) ----------

  /**
   * Naye email par OTP bhejo. Email tabhi change hoga jab user us code
   * se naye email ki milkiyat sabit kare.
   */
  async requestEmailChange(
    userId: string,
    dto: RequestEmailChangeDto,
  ): Promise<{ message: string; email: string }> {
    const email = dto.newEmail.trim().toLowerCase();
    const me = await this.users.getProfile(userId);
    if (email === me.email) {
      throw new BadRequestException('Ye email pehle se apka hai.');
    }
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Ye email pehle se registered hai.');
    }

    const code = await this.otp.issue(email, 'email_change');
    await this.mail.sendOtpEmail(email, code, 'email_change', this.otp.ttl);
    this.logger.log(`Email change requested: ${me.email} -> ${email}`);
    return {
      message:
        'Naye email par verification code bheja gaya hai. Code darj karke email change confirm karen.',
      email,
    };
  }

  async confirmEmailChange(
    userId: string,
    dto: ConfirmEmailChangeDto,
  ): Promise<{ message: string; email: string }> {
    const email = dto.newEmail.trim().toLowerCase();
    await this.otp.verify(email, 'email_change', dto.otp);

    const me = await this.users.getProfile(userId);
    if (email === me.email) {
      throw new BadRequestException('Ye email pehle se apka hai.');
    }
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Ye email pehle se registered hai.');
    }

    const oldEmail = me.email;
    await this.users.setEmail(userId, email);
    // Purane email par ittila — hijack ki surat me malik ko khabar ho.
    await this.mail
      .sendEmailChangedNotice(oldEmail, email)
      .catch(() => undefined);
    this.logger.log(
      `Email changed: ${oldEmail} -> ${email} (sessions logged out)`,
    );
    return {
      message: 'Email change ho gaya. Naye email se dobara login karen.',
      email,
    };
  }

  // ---------- tokens ----------

  private async issueTokens(userId: string): Promise<TokenPair> {
    const authUser = await this.users.findAuthUser(userId);
    if (!authUser || !authUser.isActive) {
      throw new UnauthorizedException('Account nahi mila ya band hai.');
    }
    const full = await this.users.getProfile(userId);

    const accessToken = await this.jwt.signAsync(
      { sub: authUser.id, email: authUser.email, role: authUser.role },
      { secret: this.accessSecret, expiresIn: this.accessExpiresIn },
    );
    // jti: ek hi second me bane do tokens kabhi same string na hon.
    const refreshToken = await this.jwt.signAsync(
      { sub: authUser.id, jti: randomUUID() },
      { secret: this.refreshSecret, expiresIn: this.refreshExpiresIn },
    );
    await this.users.storeRefreshTokenHash(userId, refreshToken);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: String(this.accessExpiresIn),
      user: full,
    };
  }

  /** JwtStrategy ke liye. */
  async validateAuthUser(id: string): Promise<AuthUser> {
    const authUser = await this.users.findAuthUser(id);
    if (!authUser || !authUser.isActive) {
      throw new UnauthorizedException('Session khatam — dobara login karen.');
    }
    const { isActive, ...rest } = authUser;
    void isActive;
    return rest;
  }
}
