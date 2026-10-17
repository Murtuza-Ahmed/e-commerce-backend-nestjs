import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/decorators';
import { UsersService } from './users.service';
import {
  ChangePasswordDto,
  CreateUserDto,
  SetActiveDto,
  SetRoleDto,
  UpdateUserDto,
} from './dto/user.dto';

/**
 * Do perspectives:
 *  - /users/me* : har logged-in user apne liye (koi permission nahi chahiye)
 *  - baqi      : staff — @RequirePermissions se dynamic RBAC
 */
@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // ---------- self-service (koi bhi logged-in user) ----------

  @Get('me')
  me(@CurrentUser('id') id: string) {
    return this.users.getProfile(id);
  }

  @Patch('me')
  updateMe(@CurrentUser('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateProfile(id, dto);
  }

  @Post('me/change-password')
  changeMyPassword(
    @CurrentUser('id') id: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.users.changePassword(id, dto.currentPassword, dto.newPassword);
  }

  // ---------- staff management ----------

  @Get()
  @RequirePermissions('users:read')
  list(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('search') search?: string,
  ) {
    return this.users.listUsers(
      Math.max(page, 1),
      Math.min(limit, 100),
      search,
    );
  }

  @Get(':id')
  @RequirePermissions('users:read')
  one(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getOne(id);
  }

  @Post()
  @RequirePermissions('users:create')
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.createByAdmin(dto, actor);
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.updateByAdmin(id, dto, actor);
  }

  @Patch(':id/role')
  @RequirePermissions('users:manage-roles')
  setRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRoleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.setRole(id, dto.roleId, actor);
  }

  @Patch(':id/active')
  @RequirePermissions('users:activate')
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetActiveDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.setActive(id, dto.isActive, actor);
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.deleteUser(id, actor);
  }
}
