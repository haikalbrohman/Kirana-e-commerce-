import { Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { clampInt } from '../common/util.js';
import { OrderWorkflowService } from './order-workflow.service.js';

export const orderDetailInclude = {
  items: { include: { review: { select: { id: true, rating: true } } } },
  shipment: true,
  events: { orderBy: { createdAt: 'asc' as const } },
  store: { select: { name: true, slug: true, city: true } },
  payment: { select: { id: true, status: true, amount: true, expiresAt: true, paidAt: true, paymentType: true, redirectUrl: true, provider: true, providerOrderId: true } },
};

@Controller('orders')
export class OrdersController {
  constructor(private readonly prisma: PrismaService, private readonly workflow: OrderWorkflowService) {}

  @Get() async list(@CurrentUser() u: AuthUser, @Query('status') status?: string, @Query('page') page?: string) {
    const p = clampInt(page, 1, 200, 1);
    const where = { buyerId: u.id, ...(status ? { status: status as any } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.client.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * 10,
        take: 10,
        include: { items: { take: 3 }, store: { select: { name: true, slug: true } }, payment: { select: { id: true, status: true, expiresAt: true, redirectUrl: true } }, _count: { select: { items: true } } },
      }),
      this.prisma.client.order.count({ where }),
    ]);
    return { items, total, page: p };
  }

  @Get(':id') async detail(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    const o = await this.prisma.client.order.findFirst({ where: { id, buyerId: u.id }, include: orderDetailInclude });
    if (!o) throw new NotFoundException('Pesanan tidak ditemukan');
    return o;
  }

  /** Pembeli mengonfirmasi barang sudah diterima -> pesanan selesai */
  @Post(':id/complete') @HttpCode(200) async complete(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    const o = await this.prisma.client.order.findFirst({ where: { id, buyerId: u.id }, select: { status: true } });
    if (!o) throw new NotFoundException('Pesanan tidak ditemukan');
    if (o.status === 'SHIPPED') await this.workflow.transition(id, 'DELIVERED', { id: u.id, role: 'buyer' }, { note: 'Pembeli menerima barang' });
    else if (o.status !== 'DELIVERED') throw new ForbiddenException('Pesanan belum dikirim');
    return this.workflow.transition(id, 'COMPLETED', { id: u.id, role: 'buyer' }, { note: 'Dikonfirmasi pembeli' });
  }
}
