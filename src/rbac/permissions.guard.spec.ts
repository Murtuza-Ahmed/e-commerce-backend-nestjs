import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { AuthUser } from '../common/decorators';

function ctxWith(user: AuthUser | undefined, required: string[] | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  } as unknown as Reflector;
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
  return { guard: new PermissionsGuard(reflector), context };
}

const baseUser: AuthUser = {
  id: 'u1',
  email: 'a@b.c',
  role: 'admin',
  roleId: 'r1',
  level: 50,
  grantsAll: false,
  permissions: ['users:read', 'users:create'],
};

describe('PermissionsGuard (dynamic RBAC)', () => {
  it('decorator na ho to sirf login kafi — allow', () => {
    const { guard, context } = ctxWith(baseUser, undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('required permission ho to allow', () => {
    const { guard, context } = ctxWith(baseUser, ['users:read']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('permission na ho to ForbiddenException', () => {
    const { guard, context } = ctxWith(baseUser, ['users:delete']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('grantsAll (super_admin) har cheez bypass kare', () => {
    const { guard, context } = ctxWith(
      { ...baseUser, grantsAll: true, permissions: [] },
      ['payments:delete', 'roles:create'],
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('bina user ke deny', () => {
    const { guard, context } = ctxWith(undefined, ['users:read']);
    expect(guard.canActivate(context)).toBe(false);
  });
});
