import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategy/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { OtpModule } from '../otp/otp.module';

/** "15m" / "3600" dono formats chalte hain. */
function parseExpiresIn(raw: string | undefined): JwtSignOptions['expiresIn'] {
  const value = (raw ?? '15m').trim();
  if (/^\d+$/.test(value)) {
    return `${value}s` as JwtSignOptions['expiresIn'];
  }
  return value as JwtSignOptions['expiresIn'];
}

@Module({
  imports: [
    PassportModule,
    UsersModule,
    OtpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: parseExpiresIn(
            config.get<string>('JWT_ACCESS_EXPIRES_IN'),
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
