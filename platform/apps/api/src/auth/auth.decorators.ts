import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '@shopia/db';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Endpoint bisa diakses tanpa login (jika ada token, pengguna tetap dikenali). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Endpoint hanya untuk peran tertentu. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  roles: Role[];
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  return ctx.switchToHttp().getRequest().user;
});
