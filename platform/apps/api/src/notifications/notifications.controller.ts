import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller()
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('notifications') async list(@CurrentUser() u: AuthUser) {
    const [items, unread] = await Promise.all([
      this.prisma.client.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.client.notification.count({ where: { userId: u.id, readAt: null } }),
    ]);
    return { items, unread };
  }

  @Post('notifications/read-all') @HttpCode(200) async readAll(@CurrentUser() u: AuthUser) {
    await this.prisma.client.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  /** Profil singkat + peran (dipakai web untuk menampilkan menu penjual/admin) */
  @Get('me') async me(@CurrentUser() u: AuthUser) {
    const [store, unread, cartCount] = await Promise.all([
      this.prisma.client.store.findUnique({ where: { ownerId: u.id }, select: { id: true, name: true, slug: true, status: true } }),
      this.prisma.client.notification.count({ where: { userId: u.id, readAt: null } }),
      this.prisma.client.cartItem.aggregate({ where: { cart: { userId: u.id } }, _sum: { quantity: true } }),
    ]);
    return { ...u, store, unreadNotifications: unread, cartCount: cartCount._sum.quantity ?? 0 };
  }
}
