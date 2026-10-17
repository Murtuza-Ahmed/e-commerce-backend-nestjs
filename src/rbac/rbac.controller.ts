import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators';
import { RbacService } from './rbac.service';
import {
  CreateRoleDto,
  SetPermissionsDto,
  UpdateRoleDto,
} from './dto/role.dto';

/**
 * Dynamic RBAC management — tamam endpoints sirf super_admin ke liye
 * (uske role me roles:* permissions hain).
 */
@ApiTags('rbac')
@ApiBearerAuth('JWT-auth')
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('permissions')
  @RequirePermissions('roles:read')
  permissions() {
    return this.rbac.listPermissions();
  }

  @Get('roles')
  @RequirePermissions('roles:read')
  roles() {
    return this.rbac.listRoles();
  }

  @Get('roles/:id')
  @RequirePermissions('roles:read')
  role(@Param('id', ParseUUIDPipe) id: string) {
    return this.rbac.getRole(id);
  }

  @Post('roles')
  @RequirePermissions('roles:create')
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbac.createRole(dto);
  }

  @Patch('roles/:id')
  @RequirePermissions('roles:update')
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rbac.updateRole(id, dto);
  }

  @Put('roles/:id/permissions')
  @RequirePermissions('roles:assign-permissions')
  setPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPermissionsDto,
  ) {
    return this.rbac.setRolePermissions(id, dto.permissions);
  }

  @Delete('roles/:id')
  @RequirePermissions('roles:delete')
  deleteRole(@Param('id', ParseUUIDPipe) id: string) {
    return this.rbac.deleteRole(id);
  }
}
