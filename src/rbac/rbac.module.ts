import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';

/**
 * TypeOrmModule export hai taake UsersModule Role repository
 * inject kar sake (bina circular dependency ke).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService, TypeOrmModule],
})
export class RbacModule {}
