import 'dotenv/config';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { createObserveModule } from '@nestjs/observe';
import { validateEnv } from './config/env.validation';
import { sslForDatabaseUrl } from './config/db-ssl';
import { JwtAuthGuard } from './auth/guard/jwt-auth.guard';
import { PermissionsGuard } from './rbac/permissions.guard';
import { HealthController } from './health/health.controller';
import { MailModule } from './mail/mail.module';
import { SmsModule } from './sms/sms.module';
import { OtpModule } from './otp/otp.module';
import { RbacModule } from './rbac/rbac.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

/**
 * Phase 1 — Users, Auth, OTP, dynamic RBAC.
 *
 * Global guards ki tartib:
 *  1. ThrottlerGuard  — rate limiting (pehle darwaze par hi roko)
 *  2. JwtAuthGuard    — @Public ke siwa har route par login lazmi
 *  3. PermissionsGuard— @RequirePermissions wali routes par DB permissions
 */

const observeAppKey = process.env.OBSERVE_APP_KEY;
const observeAppSecret = process.env.OBSERVE_APP_SECRET;
const observeEnabled = !!observeAppKey && !!observeAppSecret;

if (!observeEnabled) {
  console.warn(
    'OBSERVE_APP_KEY / OBSERVE_APP_SECRET not set — running without observability.',
  );
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.getOrThrow<string>('DATABASE_URL');
        return {
          type: 'postgres',
          url: databaseUrl,
          ssl: sslForDatabaseUrl(databaseUrl),
          synchronize: config.get<boolean>('DATABASE_SYNC') === true,
          logging: config.get<boolean>('DATABASE_LOGGING') === true,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
        };
      },
    }),
    MailModule,
    SmsModule,
    OtpModule,
    RbacModule,
    UsersModule,
    AuthModule,
    ...(observeEnabled
      ? [
        ObserveModule.forRoot({
          appKey: observeAppKey,
          appSecret: observeAppSecret,
          serviceId: 'al-ucaaz-api',
        }),
      ]
      : []),
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule { }
