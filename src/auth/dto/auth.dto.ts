import {
  IsEmail,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import type { OtpPurpose } from '../../otp/entities/otp.entity';

export class SignupDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsPhoneNumber('PK')
  phone?: string;

  @IsString()
  @MinLength(8, { message: 'Password kam az kam 8 characters ka ho' })
  password!: string;
}

export class VerifyEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}

export class ResendOtpDto {
  @IsEmail()
  email!: string;

  @IsIn(['email_verification', 'password_reset'])
  purpose!: Extract<OtpPurpose, 'email_verification' | 'password_reset'>;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;

  @IsString()
  @MinLength(8, { message: 'Naya password kam az kam 8 characters ka ho' })
  newPassword!: string;
}

export class ForgotEmailDto {
  @IsPhoneNumber('PK')
  phone!: string;
}

export class RecoverEmailDto {
  @IsPhoneNumber('PK')
  phone!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}

/** Logged-in user apna email change karna chahe — pehle naye email par OTP. */
export class RequestEmailChangeDto {
  @IsEmail()
  newEmail!: string;
}

export class ConfirmEmailChangeDto {
  @IsEmail()
  newEmail!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}
