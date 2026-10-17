import { DataSource } from 'typeorm';
import { Permission } from '../../rbac/entities/permission.entity';
import { Role } from '../../rbac/entities/role.entity';
import { ADMIN_DENIED_PERMISSIONS, PERMISSIONS } from '../../rbac/permissions';

/**
 * Dynamic RBAC ka seed — idempotent (dobara chalao to kuch nahi bigdega).
 * - Permissions: catalog se upsert (name unique).
 * - Roles: super_admin (grantsAll, level 100), admin (level 50,
 *   payments:update/delete + roles:* ke baghair), customer (level 10).
 */
export async function seedRbac(dataSource: DataSource): Promise<void> {
  const permRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);

  for (const def of PERMISSIONS) {
    await permRepo.upsert(
      {
        name: def.name,
        resource: def.resource,
        action: def.action,
        description: def.description,
      },
      ['name'],
    );
  }
  const all = await permRepo.find();

  // super_admin — grantsAll bypass
  let superAdmin = await roleRepo.findOne({ where: { name: 'super_admin' } });
  if (!superAdmin) {
    superAdmin = roleRepo.create({
      name: 'super_admin',
      description: 'Mukammal ikhtiyar — roles/permissions bhi manage karta hai',
      level: 100,
      grantsAll: true,
      isSystem: true,
      permissions: [],
    });
    await roleRepo.save(superAdmin);
  }

  // admin — sab kuch, SIWAYE payments:update/delete aur roles:* ke
  const adminPerms = all.filter(
    (p) => !ADMIN_DENIED_PERMISSIONS.includes(p.name),
  );
  let admin = await roleRepo.findOne({
    where: { name: 'admin' },
    relations: { permissions: true },
  });
  if (!admin) {
    admin = roleRepo.create({
      name: 'admin',
      description:
        'Har cheez ka access — siwaye payment update/delete aur role management ke',
      level: 50,
      grantsAll: false,
      isSystem: true,
      permissions: adminPerms,
    });
  } else {
    admin.permissions = adminPerms;
  }
  await roleRepo.save(admin);

  // customer — aam user (permissions agle phases me barhengi)
  let customer = await roleRepo.findOne({ where: { name: 'customer' } });
  if (!customer) {
    customer = roleRepo.create({
      name: 'customer',
      description: 'Aam customer — login karke website dekhta/kharidta hai',
      level: 10,
      grantsAll: false,
      isSystem: true,
      permissions: [],
    });
    await roleRepo.save(customer);
  }

  console.info(
    `RBAC seed: ${all.length} permissions, 3 roles (super_admin/admin/customer).`,
  );
}
