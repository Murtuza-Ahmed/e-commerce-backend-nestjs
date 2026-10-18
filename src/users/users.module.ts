import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RbacModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RbacModule, AuditModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
