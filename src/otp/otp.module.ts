import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Otp } from './entities/otp.entity';
import { OtpService } from './otp.service';
import { OtpCleanupService } from './otp-cleanup.service';

@Module({
  imports: [TypeOrmModule.forFeature([Otp])],
  providers: [OtpService, OtpCleanupService],
  exports: [OtpService],
})
export class OtpModule {}
