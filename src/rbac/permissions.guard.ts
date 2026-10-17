import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser, PERMISSIONS_KEY } from '../common/decorators';

/**
 * Dynamic RBAC guard — global (APP_GUARD) hai.
 * Route par @RequirePermissions('users:create') ho to user ke role ki
 * DB permissions check hoti hain. grantsAll (super_admin) bypass karta hai.
 * Jin routes par decorator nahi, wahan sirf login hona kafi hai.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) return false;
    if (user.grantsAll) return true;

    const missing = required.filter((p) => !user.permissions?.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Is action ki ijazat nahi hai (chahiye: ${missing.join(', ')}).`,
      );
    }
    return true;
  }
}
