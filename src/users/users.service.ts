import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../rbac/entities/role.entity';
import { AuthUser } from '../common/decorators';
import { CloudinaryService } from '../uploads/cloudinary.service';
import {
  comparePassword,
  hashPassword,
  hashTokenForStorage,
} from '../common/crypto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  isActive: boolean;
  role: { id: string; name: string; level: number };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Users — do perspectives:
 *  1) USER: apni profile (me), password change.
 *  2) STAFF (admin/super_admin): users list/create/update/activate/delete,
 *     role change SIRF super_admin (users:manage-roles permission).
 *
 * Level rule (dynamic, Role.level se): apne level ya upar wale ko
 * manage nahi kar sakte — grantsAll (super_admin) bypass.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ---------- internal helpers ----------

  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      role: {
        id: user.role.id,
        name: user.role.name,
        level: user.role.level,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async getRoleOrFail(roleId: string): Promise<Role> {
    const role = await this.roles.findOne({ where: { id: roleId } });
    if (!role) throw new BadRequestException('Role nahi mila.');
    return role;
  }

  private async getUserOrFail(id: string): Promise<User> {
    const user = await this.users.findOne({
      where: { id },
      relations: { role: true },
    });
    if (!user) throw new NotFoundException('User nahi mila.');
    return user;
  }

  /** Apne level ya upar wale user ko haath nahi laga sakte. */
  private assertCanManage(actor: AuthUser, target: User): void {
    if (actor.grantsAll) return;
    if (target.role.level >= actor.level) {
      throw new ForbiddenException(
        'Apne level ya upar wale user ko manage nahi kar sakte.',
      );
    }
  }

  private async assertEmailFree(
    email: string,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.users.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Ye email pehle se registered hai.');
    }
  }

  private async assertPhoneFree(
    phone: string | null | undefined,
    exceptId?: string,
  ): Promise<void> {
    if (!phone) return;
    const existing = await this.users.findOne({ where: { phone } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Ye phone number pehle se registered hai.');
    }
  }

  // ---------- auth ke liye (secrets samet) ----------

  /** Login/refresh ke liye — passwordHash + refreshTokenHash samet. */
  findByEmailWithSecrets(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .addSelect('u.passwordHash')
      .addSelect('u.refreshTokenHash')
      .where('u.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  findByIdWithSecrets(id: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .addSelect('u.passwordHash')
      .addSelect('u.refreshTokenHash')
      .where('u.id = :id', { id })
      .getOne();
  }

  /** JwtStrategy ke liye — har request par fresh permissions. */
  async findAuthUser(
    id: string,
  ): Promise<(AuthUser & { isActive: boolean }) | null> {
    const user = await this.users.findOne({
      where: { id },
      relations: { role: { permissions: true } },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      roleId: user.role.id,
      level: user.role.level,
      grantsAll: user.role.grantsAll,
      permissions: (user.role.permissions ?? []).map((p) => p.name),
      isActive: user.isActive,
    };
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({
      where: { email: email.trim().toLowerCase() },
      relations: { role: true },
    });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.users.findOne({
      where: { phone: phone.trim() },
      relations: { role: true },
    });
  }

  // ---------- signup / seed ke liye ----------

  async createCustomer(data: {
    name: string;
    email: string;
    phone?: string | null;
    password: string;
    emailVerified?: boolean;
  }): Promise<User> {
    const email = data.email.trim().toLowerCase();
    await this.assertEmailFree(email);
    await this.assertPhoneFree(data.phone ?? null);

    const role = await this.roles.findOne({ where: { name: 'customer' } });
    if (!role)
      throw new Error('customer role seed nahi hua — pehle npm run seed.');

    const user = this.users.create({
      name: data.name.trim(),
      email,
      phone: data.phone?.trim() || null,
      passwordHash: await hashPassword(data.password),
      emailVerified: data.emailVerified ?? false,
      isActive: true,
      role,
      roleId: role.id,
      refreshTokenHash: null,
    });
    return this.users.save(user);
  }

  // ---------- user self-service ----------

  async getProfile(id: string): Promise<SafeUser> {
    return this.toSafeUser(await this.getUserOrFail(id));
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    const user = await this.getUserOrFail(id);
    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.phone !== undefined) {
      const phone = dto.phone?.trim() || null;
      await this.assertPhoneFree(phone, id);
      user.phone = phone;
    }
    return this.toSafeUser(await this.users.save(user));
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.findByIdWithSecrets(id);
    if (!user) throw new NotFoundException('User nahi mila.');
    const ok = await comparePassword(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Mojooda password ghalat hai.');
    user.passwordHash = await hashPassword(newPassword);
    user.refreshTokenHash = null; // baqi sessions logout
    await this.users.save(user);
    return { message: 'Password change ho gaya. Dobara login karen.' };
  }

  // ---------- avatar (self-service) ----------

  async setAvatar(id: string, file: Express.Multer.File): Promise<SafeUser> {
    const user = await this.getUserOrFail(id);
    const { url, publicId } = await this.cloudinary.uploadImage(file.buffer, {
      folder: 'al-ucaaz/avatars',
    });
    // Purani avatar Cloudinary se saaf — orphan files nahi chhorni.
    if (user.avatarPublicId) {
      await this.cloudinary
        .deleteImage(user.avatarPublicId)
        .catch(() => undefined);
    }
    user.avatarUrl = url;
    user.avatarPublicId = publicId;
    return this.toSafeUser(await this.users.save(user));
  }

  async clearAvatar(id: string): Promise<SafeUser> {
    const user = await this.getUserOrFail(id);
    if (user.avatarPublicId) {
      await this.cloudinary
        .deleteImage(user.avatarPublicId)
        .catch(() => undefined);
    }
    user.avatarUrl = null;
    user.avatarPublicId = null;
    return this.toSafeUser(await this.users.save(user));
  }

  // ---------- staff management ----------

  async listUsers(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ data: SafeUser[]; total: number; page: number; limit: number }> {
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'role')
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (search?.trim()) {
      qb.where('(u.name ILIKE :s OR u.email ILIKE :s OR u.phone ILIKE :s)', {
        s: `%${search.trim()}%`,
      });
    }
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map((u) => this.toSafeUser(u)), total, page, limit };
  }

  async getOne(id: string): Promise<SafeUser> {
    return this.toSafeUser(await this.getUserOrFail(id));
  }

  async createByAdmin(dto: CreateUserDto, actor: AuthUser): Promise<SafeUser> {
    const role = await this.getRoleOrFail(dto.roleId);
    if (!actor.grantsAll && role.level >= actor.level) {
      throw new ForbiddenException(
        'Apne level ya upar wale role ka user nahi bana sakte.',
      );
    }
    const email = dto.email.trim().toLowerCase();
    await this.assertEmailFree(email);
    await this.assertPhoneFree(dto.phone ?? null);

    const user = this.users.create({
      name: dto.name.trim(),
      email,
      phone: dto.phone?.trim() || null,
      passwordHash: await hashPassword(dto.password),
      emailVerified: true, // staff-created accounts trusted hain
      isActive: true,
      role,
      roleId: role.id,
      refreshTokenHash: null,
    });
    const saved = await this.users.save(user);
    saved.role = role;
    return this.toSafeUser(saved);
  }

  async updateByAdmin(
    id: string,
    dto: UpdateUserDto,
    actor: AuthUser,
  ): Promise<SafeUser> {
    const user = await this.getUserOrFail(id);
    this.assertCanManage(actor, user);
    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.phone !== undefined) {
      const phone = dto.phone?.trim() || null;
      await this.assertPhoneFree(phone, id);
      user.phone = phone;
    }
    return this.toSafeUser(await this.users.save(user));
  }

  async setRole(
    id: string,
    roleId: string,
    actor: AuthUser,
  ): Promise<SafeUser> {
    const user = await this.getUserOrFail(id);
    this.assertCanManage(actor, user);
    const role = await this.getRoleOrFail(roleId);
    if (!actor.grantsAll && role.level >= actor.level) {
      throw new ForbiddenException(
        'Apne level ya upar wale role par nahi bitha sakte.',
      );
    }
    user.role = role;
    user.roleId = role.id;
    return this.toSafeUser(await this.users.save(user));
  }

  async setActive(
    id: string,
    isActive: boolean,
    actor: AuthUser,
  ): Promise<SafeUser> {
    if (id === actor.id) {
      throw new BadRequestException(
        'Khud ko activate/deactivate nahi kar sakte.',
      );
    }
    const user = await this.getUserOrFail(id);
    this.assertCanManage(actor, user);
    user.isActive = isActive;
    if (!isActive) user.refreshTokenHash = null; // foran logout
    return this.toSafeUser(await this.users.save(user));
  }

  async deleteUser(id: string, actor: AuthUser): Promise<{ message: string }> {
    if (id === actor.id) {
      throw new BadRequestException('Khud ko delete nahi kar sakte.');
    }
    const user = await this.getUserOrFail(id);
    this.assertCanManage(actor, user);
    await this.users.remove(user);
    return { message: 'User delete ho gaya.' };
  }

  // ---------- auth flows ke liye ----------

  async setEmailVerified(id: string): Promise<void> {
    await this.users.update(id, { emailVerified: true });
  }

  async setPassword(id: string, newPassword: string): Promise<void> {
    await this.users.update(id, {
      passwordHash: await hashPassword(newPassword),
      refreshTokenHash: null, // saari sessions logout
    });
  }

  async storeRefreshTokenHash(id: string, token: string): Promise<void> {
    await this.users.update(id, {
      refreshTokenHash: await hashTokenForStorage(token),
    });
  }

  async clearRefreshToken(id: string): Promise<void> {
    await this.users.update(id, { refreshTokenHash: null });
  }
}
