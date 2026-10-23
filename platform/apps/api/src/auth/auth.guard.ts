import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify } from 'jose';
import type { Role } from '@shopia/db';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { IS_PUBLIC, ROLES, type AuthUser } from './auth.decorators.js';

/**
 * Memverifikasi token dari server web (Auth.js) lalu MEMUAT ULANG pengguna dari database.
 * Peran & status diambil dari database, bukan dari isi token atau data browser.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets);
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES, targets);
    const req = ctx.switchToHttp().getRequest();

    const header: string | undefined = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (token) {
      let userId: string | undefined;
      try {
        const { payload } = await jwtVerify(token, this.config.jwt.secret, {
          issuer: this.config.jwt.issuer,
          audience: this.config.jwt.audience,
          algorithms: ['HS256'],
        });
        userId = payload.sub;
      } catch {
        if (!isPublic) throw new UnauthorizedException('Sesi tidak valid, silakan masuk lagi');
      }
      if (userId) {
        const user = await this.prisma.client.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true, roles: true, status: true },
        });
        if (!user) throw new UnauthorizedException('Akun tidak ditemukan');
        if (user.status !== 'ACTIVE') throw new ForbiddenException('Akun dinonaktifkan. Hubungi admin Shopia.');
        req.user = { id: user.id, email: user.email, name: user.name, roles: user.roles } satisfies AuthUser;
      }
    }

    if (isPublic) return true;
    if (!req.user) throw new UnauthorizedException('Silakan masuk terlebih dahulu');
    if (roles?.length && !roles.some((r) => (req.user as AuthUser).roles.includes(r))) {
      throw new ForbiddenException('Anda tidak memiliki akses ke fitur ini');
    }
    return true;
  }
}
