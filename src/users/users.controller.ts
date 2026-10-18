import {
  BadRequestException,
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/decorators';
import { imageUploadOptions } from '../uploads/multer.config';
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
  @UseInterceptors(FileInterceptor('avatar', imageUploadOptions))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    description:
      'JSON bhejen (sirf data) ya form-data (data + optional avatar file). Picture OPTIONAL hai.',
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Optional profile picture (sirf form-data me)',
        },
        name: { type: 'string', example: 'Ali Raza' },
        phone: { type: 'string', example: '03001234567' },
      },
    },
  })
  updateMe(
    @CurrentUser('id') id: string,
    @Body() dto: UpdateUserDto,
    @UploadedFile() avatar: Express.Multer.File | undefined,
  ) {
    return this.users.updateProfile(id, dto, avatar);
  }

  @Post('me/change-password')
  changeMyPassword(
    @CurrentUser('id') id: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.users.changePassword(id, dto.currentPassword, dto.newPassword);
  }

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  @ApiConsumes('multipart/form-data')
  setMyAvatar(
    @CurrentUser('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException(
        "'file' field me image bhejen (multipart/form-data).",
      );
    }
    return this.users.setAvatar(id, file);
  }

  @Delete('me/avatar')
  clearMyAvatar(@CurrentUser('id') id: string) {
    return this.users.clearAvatar(id);
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
  @UseInterceptors(FileInterceptor('avatar', imageUploadOptions))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    description:
      'JSON bhejen ya form-data (optional avatar file ke sath). Picture OPTIONAL hai — na ho to user waise hi ban jayega.',
    schema: {
      type: 'object',
      required: ['name', 'email', 'password', 'roleId'],
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Optional profile picture (sirf form-data me)',
        },
        name: { type: 'string', example: 'Ali Raza' },
        email: { type: 'string', example: 'ali@example.com' },
        phone: { type: 'string', example: '03001234567' },
        password: { type: 'string', example: 'StrongPass123' },
        roleId: { type: 'string', format: 'uuid' },
      },
    },
  })
  create(
    @Body() dto: CreateUserDto,
    @UploadedFile() avatar: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.createByAdmin(dto, actor, avatar);
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  @UseInterceptors(FileInterceptor('avatar', imageUploadOptions))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    description:
      'JSON bhejen (sirf data) ya form-data (data + optional avatar file). Picture OPTIONAL hai.',
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Optional profile picture (sirf form-data me)',
        },
        name: { type: 'string', example: 'Ali Raza' },
        phone: { type: 'string', example: '03001234567' },
      },
    },
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @UploadedFile() avatar: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.updateByAdmin(id, dto, actor, avatar);
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
