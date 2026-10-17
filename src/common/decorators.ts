import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

/** Is route par JWT guard skip karo (signup, login, OTP waghera). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Dynamic RBAC: route ke liye kaunsi permissions chahiye. */
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** JwtStrategy jo object request.user par rakhta hai. */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  roleId: string;
  /** Role hierarchy level — user-management protections ke liye. */
  level: number;
  /** super_admin jaisa bypass. */
  grantsAll: boolean;
  permissions: string[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    if (!request.user) return undefined;
    return data ? request.user[data] : request.user;
  },
);
