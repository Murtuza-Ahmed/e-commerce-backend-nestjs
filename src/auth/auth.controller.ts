import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from '../common/decorators';
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
  RefreshDto,
} from './dto/auth.dto';

/**
 * Public auth flows. OTP/login/signup par rate-limit sakht hai
 * (brute-force protection) — global 120/min ke upar ye 20/min.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('signup')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.auth.resendOtp(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  logout(@CurrentUser('id') userId: string) {
    return this.auth.logout(userId);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Public()
  @Post('forgot-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  forgotEmail(@Body() dto: ForgotEmailDto) {
    return this.auth.forgotEmail(dto);
  }

  @Public()
  @Post('recover-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  recoverEmail(@Body() dto: RecoverEmailDto) {
    return this.auth.recoverEmail(dto);
  }

  // ---------- email change (login lazmi) ----------

  @ApiBearerAuth('JWT-auth')
  @Post('change-email/request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  requestEmailChange(
    @CurrentUser('id') id: string,
    @Body() dto: RequestEmailChangeDto,
  ) {
    return this.auth.requestEmailChange(id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Post('change-email/confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  confirmEmailChange(
    @CurrentUser('id') id: string,
    @Body() dto: ConfirmEmailChangeDto,
  ) {
    return this.auth.confirmEmailChange(id, dto);
  }
}
