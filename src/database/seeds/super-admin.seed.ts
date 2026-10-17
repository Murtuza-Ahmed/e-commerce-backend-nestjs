import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../rbac/entities/role.entity';
import { hashPassword } from '../../common/crypto';

/**
 * Pehla super admin — .env ke SUPER_ADMIN_EMAIL/PASSWORD se.
 * Pehle se ho to password/role refresh kar deta hai (idempotent).
 */
export async function seedSuperAdmin(
  dataSource: DataSource,
  opts: { email: string; password: string },
): Promise<void> {
  const email = opts.email.trim().toLowerCase();
  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);

  const role = await roleRepo.findOne({ where: { name: 'super_admin' } });
  if (!role) {
    throw new Error('super_admin role nahi mila — pehle seedRbac chalao.');
  }

  const passwordHash = await hashPassword(opts.password);
  let user = await userRepo.findOne({ where: { email } });
  if (user) {
    user.passwordHash = passwordHash;
    user.role = role;
    user.roleId = role.id;
    user.emailVerified = true;
    user.isActive = true;
    user.name = user.name || 'Super Admin';
    await userRepo.save(user);
    console.info(`Super admin updated: ${email}`);
  } else {
    user = userRepo.create({
      name: 'Super Admin',
      email,
      phone: null,
      passwordHash,
      emailVerified: true,
      isActive: true,
      role,
      roleId: role.id,
      refreshTokenHash: null,
    });
    await userRepo.save(user);
    console.info(`Super admin created: ${email}`);
  }
}
