import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { User } from '../users/entities/user.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

/**
 * Dynamic RBAC management — sirf super_admin ke paas iski permissions hain.
 * Roles/permissions DB me hain, code me hardcode nahi.
 */
@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
    private readonly dataSource: DataSource,
  ) {}

  listPermissions(): Promise<Permission[]> {
    return this.permissions.find({ order: { resource: 'ASC', action: 'ASC' } });
  }

  listRoles(): Promise<Role[]> {
    return this.roles.find({
      relations: { permissions: true },
      order: { level: 'DESC' },
    });
  }

  async getRole(id: string): Promise<Role> {
    const role = await this.roles.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) throw new NotFoundException('Role nahi mila.');
    return role;
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return this.roles.findOne({
      where: { name },
      relations: { permissions: true },
    });
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const exists = await this.roles.findOne({ where: { name: dto.name } });
    if (exists) {
      throw new ConflictException(`Role '${dto.name}' pehle se mojood hai.`);
    }
    const role = this.roles.create({
      name: dto.name,
      description: dto.description ?? null,
      level: dto.level ?? 0,
      grantsAll: dto.grantsAll ?? false,
      isSystem: false,
      permissions: await this.resolvePermissions(dto.permissionNames ?? []),
    });
    return this.roles.save(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.getRole(id);
    if (dto.name && dto.name !== role.name) {
      const exists = await this.roles.findOne({ where: { name: dto.name } });
      if (exists) {
        throw new ConflictException(`Role '${dto.name}' pehle se mojood hai.`);
      }
      role.name = dto.name;
    }
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.level !== undefined) role.level = dto.level;
    if (dto.grantsAll !== undefined) role.grantsAll = dto.grantsAll;
    if (dto.permissionNames !== undefined) {
      role.permissions = await this.resolvePermissions(dto.permissionNames);
    }
    return this.roles.save(role);
  }

  async deleteRole(id: string): Promise<{ message: string }> {
    const role = await this.getRole(id);
    if (role.isSystem) {
      throw new ForbiddenException('System role delete nahi ho sakta.');
    }
    const inUse = await this.dataSource
      .getRepository(User)
      .count({ where: { roleId: id } });
    if (inUse > 0) {
      throw new ConflictException(
        `Is role par ${inUse} user(s) hain — pehle unka role badlen.`,
      );
    }
    await this.roles.remove(role);
    return { message: `Role '${role.name}' delete ho gaya.` };
  }

  async setRolePermissions(
    id: string,
    permissionNames: string[],
  ): Promise<Role> {
    const role = await this.getRole(id);
    role.permissions = await this.resolvePermissions(permissionNames);
    return this.roles.save(role);
  }

  private async resolvePermissions(names: string[]): Promise<Permission[]> {
    if (names.length === 0) return [];
    const unique = [...new Set(names)];
    const found = await this.permissions.findBy({ name: In(unique) });
    const missing = unique.filter((n) => !found.some((p) => p.name === n));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Ye permissions mojood nahi: ${missing.join(', ')}`,
      );
    }
    return found;
  }
}
