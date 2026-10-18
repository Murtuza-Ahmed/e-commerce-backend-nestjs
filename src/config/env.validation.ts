import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Saari credentials aur settings ek jagah validate hoti hain.
 * App start hote hi galat/missing env par seedha error dega —
 * aadhi chalti app se behtar hai pehle hi ruk jana (real-world practice).
 */

function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (typeof value === 'number') return value !== 0;
  return false;
}

function toInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number')
    return Number.isNaN(value) ? undefined : Math.trunc(value);
  if (typeof value === 'string') {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

class EnvironmentVariables {
  // ---- Database (Neon PostgreSQL) ----
  @IsString()
  DATABASE_URL!: string;

  /** Sirf pehli dafa tables banane ke liye true. Baad me hamesha false. */
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  DATABASE_SYNC = false;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  DATABASE_LOGGING = false;

  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @IsInt()
  @Min(1)
  PORT = 3000;

  // ---- JWT ----
  @IsString()
  @MinLength(16, {
    message: 'JWT_ACCESS_SECRET kam az kam 16 characters ka ho',
  })
  JWT_ACCESS_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES_IN = '15m';

  @IsString()
  @MinLength(16, {
    message: 'JWT_REFRESH_SECRET kam az kam 16 characters ka ho',
  })
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES_IN = '7d';

  // ---- Email (OTP) — na ho to dev mode me OTP console par print hoga ----
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @IsInt()
  @Min(1)
  SMTP_PORT = 587;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  @IsOptional()
  @IsEmail()
  SMTP_FROM?: string;

  // ---- OTP ----
  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @IsInt()
  @Min(1)
  OTP_TTL_MINUTES = 10;

  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @IsInt()
  @Min(1)
  OTP_MAX_ATTEMPTS = 5;

  /** OTP hash karne ka secret. Na ho to dev default + warning. */
  @IsOptional()
  @IsString()
  OTP_SECRET?: string;

  // ---- SMS (forgot-email OTP) — na ho to dev mode me console par print ----
  @IsOptional()
  @IsString()
  TWILIO_ACCOUNT_SID?: string;

  @IsOptional()
  @IsString()
  TWILIO_AUTH_TOKEN?: string;

  @IsOptional()
  @IsString()
  TWILIO_FROM?: string;

  // ---- Cloudinary (image uploads) — na ho to upload endpoints 400 denge ----
  @IsOptional()
  @IsString()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_KEY?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_SECRET?: string;

  // ---- NestJS Observe (tracing/monitoring) — na ho to telemetry nahi jayegi ----
  @IsOptional()
  @IsString()
  OBSERVE_APP_KEY?: string;

  @IsOptional()
  @IsString()
  OBSERVE_APP_SECRET?: string;

  // ---- Pehla super admin (seed ke liye) ----
  @IsEmail()
  SUPER_ADMIN_EMAIL!: string;

  @IsString()
  @MinLength(8, {
    message: 'SUPER_ADMIN_PASSWORD kam az kam 8 characters ka ho',
  })
  SUPER_ADMIN_PASSWORD!: string;

  // ---- Misc ----
  @IsOptional()
  @IsString()
  CORS_ORIGIN = '*';

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map(
        (e) =>
          `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('; ');
    throw new Error(`Environment validation failed -> ${messages}`);
  }
  return validated;
}

export type EnvVars = EnvironmentVariables;
