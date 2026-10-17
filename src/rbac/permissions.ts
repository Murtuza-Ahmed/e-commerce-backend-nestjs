/**
 * Permission catalog — dynamic RBAC ki bunyad.
 *
 * Format: `resource:action`. Ye list DB me seed hoti hai, aur
 * super_admin `/rbac` endpoints se nayi permissions bana sakta hai
 * ya roles ko de/che sakta hai — code me hardcode nahi.
 *
 * NOTE: payments:* permissions abhi se reserve hain. Payments module
 * agle phase me aayega; tab yehi permissions enforce hongi.
 * Admin ko payments:update / payments:delete NAHI milenge (requirement).
 */

export interface PermissionDef {
  name: string;
  resource: string;
  action: string;
  description: string;
}

export const PERMISSIONS: PermissionDef[] = [
  // ---- users ----
  {
    name: 'users:read',
    resource: 'users',
    action: 'read',
    description: 'Users ki list / detail dekhna',
  },
  {
    name: 'users:create',
    resource: 'users',
    action: 'create',
    description: 'Naya user banana (admin/customer)',
  },
  {
    name: 'users:update',
    resource: 'users',
    action: 'update',
    description: 'User ka data update karna',
  },
  {
    name: 'users:delete',
    resource: 'users',
    action: 'delete',
    description: 'User delete karna',
  },
  {
    name: 'users:activate',
    resource: 'users',
    action: 'activate',
    description: 'User activate/deactivate karna',
  },
  {
    name: 'users:manage-roles',
    resource: 'users',
    action: 'manage-roles',
    description: 'User ka role change karna',
  },
  // ---- roles (dynamic RBAC management) ----
  {
    name: 'roles:read',
    resource: 'roles',
    action: 'read',
    description: 'Roles aur unki permissions dekhna',
  },
  {
    name: 'roles:create',
    resource: 'roles',
    action: 'create',
    description: 'Naya role banana',
  },
  {
    name: 'roles:update',
    resource: 'roles',
    action: 'update',
    description: 'Role update karna',
  },
  {
    name: 'roles:delete',
    resource: 'roles',
    action: 'delete',
    description: 'Role delete karna',
  },
  {
    name: 'roles:assign-permissions',
    resource: 'roles',
    action: 'assign-permissions',
    description: 'Role ko permissions dena/cheena',
  },
  // ---- payments (agla phase — abhi se reserve) ----
  {
    name: 'payments:read',
    resource: 'payments',
    action: 'read',
    description: 'Payments dekhna',
  },
  {
    name: 'payments:create',
    resource: 'payments',
    action: 'create',
    description: 'Payment record banana',
  },
  {
    name: 'payments:update',
    resource: 'payments',
    action: 'update',
    description: 'Payment update karna (admin ko NAHI milega)',
  },
  {
    name: 'payments:delete',
    resource: 'payments',
    action: 'delete',
    description: 'Payment delete karna (admin ko NAHI milega)',
  },
  {
    name: 'payments:refund',
    resource: 'payments',
    action: 'refund',
    description: 'Refund process karna',
  },
];

/** Admin role ko ye permissions kabhi nahi milengi. */
export const ADMIN_DENIED_PERMISSIONS = [
  'roles:read',
  'roles:create',
  'roles:update',
  'roles:delete',
  'roles:assign-permissions',
  'users:manage-roles',
  'payments:update',
  'payments:delete',
];
