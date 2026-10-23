import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, Length } from 'class-validator';
import type { Prisma, Role } from '@shopia/db';
import { CurrentUser, Roles, type AuthUser } from '../auth/auth.decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit.service.js';
import { NotificationService } from '../common/notification.service.js';
import { clampInt } from '../common/util.js';
import { OrderWorkflowService } from '../orders/order-workflow.service.js';

class ReasonDto {
  @IsString() @Length(5, 300) reason!: string;
}
class UserUpdateDto {
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsIn(['BUYER', 'SELLER', 'ADMIN'], { each: true }) roles?: Role[];
  @IsOptional() @IsIn(['ACTIVE', 'SUSPENDED']) status?: 'ACTIVE' | 'SUSPENDED';
}

const PAGE = 20;

/** Dasbor administrator. Semua tindakan yang mengubah data dicatat di audit log. */
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    private readonly workflow: OrderWorkflowService,
  ) {}

  @Get('stats') async stats() {
    const since = new Date(Date.now() - 30 * 864e5);
    const db = this.prisma.client;
    const [users, sellers, stores, products, orders, gmv, pendingPayments, ai, refundFlags] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { roles: { has: 'SELLER' } } }),
      db.store.groupBy({ by: ['status'], _count: true }),
      db.product.groupBy({ by: ['status'], _count: true }),
      db.order.groupBy({ by: ['status'], _count: true }),
      db.payment.aggregate({ where: { status: 'PAID', paidAt: { gte: since } }, _sum: { amount: true }, _count: true }),
      db.payment.count({ where: { status: 'PENDING' } }),
      db.aiInteraction.aggregate({ where: { createdAt: { gte: new Date(Date.now() - 864e5) } }, _count: true, _sum: { inputTokens: true, outputTokens: true } }),
      db.auditLog.count({ where: { action: { in: ['order.refund_required', 'payment.paid_after_cancel', 'payment.amount_mismatch'] }, createdAt: { gte: since } } }),
    ]);
    const toMap = (rows: { status: string; _count: number }[]) => Object.fromEntries(rows.map((r) => [r.status, r._count]));
    return {
      users,
      sellers,
      stores: toMap(stores),
      products: toMap(products),
      orders: toMap(orders),
      gmv30d: gmv._sum.amount ?? 0,
      paidPayments30d: gmv._count,
      pendingPayments,
      ai24h: { requests: ai._count, tokens: (ai._sum.inputTokens ?? 0) + (ai._sum.outputTokens ?? 0) },
      attentionNeeded30d: refundFlags,
    };
  }

  // --------------------------------------------------------------- toko
  @Get('stores') stores(@Query('status') status?: string, @Query('page') page?: string) {
    const p = clampInt(page, 1, 500, 1);
    return this.prisma.client.store.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * PAGE,
      take: PAGE,
      include: { owner: { select: { name: true, email: true } }, _count: { select: { products: true, orders: true } } },
    });
  }

  @Post('stores/:id/approve') @HttpCode(200) async approveStore(@CurrentUser() a: AuthUser, @Param('id') id: string, @Req() req: any) {
    const store = await this.prisma.client.store.update({ where: { id }, data: { status: 'ACTIVE' } });
    await this.audit.log({ actorId: a.id, action: 'store.approve', entityType: 'Store', entityId: id, ip: req.ip });
    await this.notifications.notify(store.ownerId, 'Toko disetujui 🎉', `Toko ${store.name} sudah aktif. Produkmu kini tampil untuk pembeli.`, '/seller');
    return store;
  }

  @Post('stores/:id/suspend') @HttpCode(200) async suspendStore(@CurrentUser() a: AuthUser, @Param('id') id: string, @Body() dto: ReasonDto, @Req() req: any) {
    const store = await this.prisma.client.store.update({ where: { id }, data: { status: 'SUSPENDED' } });
    await this.audit.log({ actorId: a.id, action: 'store.suspend', entityType: 'Store', entityId: id, metadata: { reason: dto.reason }, ip: req.ip });
    await this.notifications.notify(store.ownerId, 'Toko dinonaktifkan', `Toko ${store.name} dinonaktifkan: ${dto.reason}`, '/seller');
    return store;
  }

  // ------------------------------------------------------------- produk
  @Get('products') products(@Query('status') status?: string, @Query('q') q?: string, @Query('page') page?: string) {
    const p = clampInt(page, 1, 500, 1);
    return this.prisma.client.product.findMany({
      where: { ...(status ? { status: status as any } : {}), ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      orderBy: { updatedAt: 'desc' },
      skip: (p - 1) * PAGE,
      take: PAGE,
      include: { store: { select: { name: true, slug: true } }, images: { take: 1, orderBy: { sortOrder: 'asc' } }, category: { select: { name: true } } },
    });
  }

  @Post('products/:id/takedown') @HttpCode(200) async takedown(@CurrentUser() a: AuthUser, @Param('id') id: string, @Body() dto: ReasonDto, @Req() req: any) {
    const p = await this.prisma.client.product.update({ where: { id }, data: { status: 'REJECTED', moderationNote: dto.reason }, include: { store: { select: { ownerId: true } } } });
    await this.audit.log({ actorId: a.id, action: 'product.takedown', entityType: 'Product', entityId: id, metadata: { reason: dto.reason }, ip: req.ip });
    await this.notifications.notify(p.store.ownerId, 'Produk diturunkan', `"${p.name}" diturunkan admin: ${dto.reason}`, `/seller/products/${p.id}`);
    return p;
  }

  @Post('products/:id/restore') @HttpCode(200) async restore(@CurrentUser() a: AuthUser, @Param('id') id: string, @Req() req: any) {
    const p = await this.prisma.client.product.update({ where: { id }, data: { status: 'ACTIVE', moderationNote: null }, include: { store: { select: { ownerId: true } } } });
    await this.audit.log({ actorId: a.id, action: 'product.restore', entityType: 'Product', entityId: id, ip: req.ip });
    await this.notifications.notify(p.store.ownerId, 'Produk dipulihkan', `"${p.name}" kembali tampil di katalog.`, `/seller/products/${p.id}`);
    return p;
  }

  // ----------------------------------------------------------- pengguna
  @Get('users') users(@Query('q') q?: string, @Query('role') role?: string, @Query('page') page?: string) {
    const p = clampInt(page, 1, 500, 1);
    const where: Prisma.UserWhereInput = {
      ...(q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } : {}),
      ...(role ? { roles: { has: role as Role } } : {}),
    };
    return this.prisma.client.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * PAGE,
      take: PAGE,
      select: { id: true, name: true, email: true, roles: true, status: true, createdAt: true, emailVerified: true, store: { select: { name: true } } },
    });
  }

  @Patch('users/:id') async updateUser(@CurrentUser() a: AuthUser, @Param('id') id: string, @Body() dto: UserUpdateDto, @Req() req: any) {
    if (id === a.id && (dto.status === 'SUSPENDED' || (dto.roles && !dto.roles.includes('ADMIN')))) throw new BadRequestException('Tidak bisa menonaktifkan atau mencabut peran admin akun sendiri');
    const before = await this.prisma.client.user.findUnique({ where: { id }, select: { roles: true, status: true } });
    if (!before) throw new NotFoundException('Pengguna tidak ditemukan');
    const roles = dto.roles ? [...new Set<Role>(['BUYER', ...dto.roles])] : undefined;
    const user = await this.prisma.client.user.update({ where: { id }, data: { roles, status: dto.status }, select: { id: true, email: true, roles: true, status: true } });
    await this.audit.log({ actorId: a.id, action: 'user.update', entityType: 'User', entityId: id, metadata: { before, after: { roles: user.roles, status: user.status } }, ip: req.ip });
    return user;
  }

  // ---------------------------------------------- pesanan & pembayaran
  @Get('orders') orders(@Query('status') status?: string, @Query('page') page?: string) {
    const p = clampInt(page, 1, 500, 1);
    return this.prisma.client.order.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * PAGE,
      take: PAGE,
      include: { store: { select: { name: true } }, buyer: { select: { email: true } }, payment: { select: { status: true, provider: true } } },
    });
  }

  @Post('orders/:id/cancel') @HttpCode(200) cancelOrder(@CurrentUser() a: AuthUser, @Param('id') id: string, @Body() dto: ReasonDto) {
    return this.workflow.transition(id, 'CANCELLED', { id: a.id, role: 'admin' }, { cancelReason: dto.reason });
  }

  /** Tandai dana sudah dicairkan ke penjual (pencairan dilakukan di dasbor mitra pembayaran). */
  @Post('orders/:id/payout') @HttpCode(200) async payout(@CurrentUser() a: AuthUser, @Param('id') id: string, @Req() req: any) {
    const res = await this.prisma.client.order.updateMany({ where: { id, status: 'COMPLETED', payoutStatus: 'PENDING' }, data: { payoutStatus: 'PAID_OUT' } });
    if (!res.count) throw new BadRequestException('Hanya pesanan selesai dengan pencairan tertunda yang bisa ditandai');
    await this.audit.log({ actorId: a.id, action: 'order.payout', entityType: 'Order', entityId: id, ip: req.ip });
    return { ok: true };
  }

  @Get('payments') payments(@Query('status') status?: string, @Query('page') page?: string) {
    const p = clampInt(page, 1, 500, 1);
    return this.prisma.client.payment.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * PAGE,
      take: PAGE,
      select: { id: true, providerOrderId: true, provider: true, amount: true, status: true, providerStatus: true, paymentType: true, createdAt: true, paidAt: true, user: { select: { email: true } }, _count: { select: { orders: true, events: true } } },
    });
  }

  @Get('audit-logs') auditLogs(@Query('action') action?: string, @Query('page') page?: string) {
    const p = clampInt(page, 1, 500, 1);
    return this.prisma.client.auditLog.findMany({
      where: action ? { action: { startsWith: action } } : {},
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * 50,
      take: 50,
      include: { actor: { select: { email: true } } },
    });
  }
}
