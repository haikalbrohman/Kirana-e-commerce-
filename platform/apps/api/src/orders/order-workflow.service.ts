import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { OrderStatus, Prisma } from '@shopia/db';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationService } from '../common/notification.service.js';
import { AuditService } from '../common/audit.service.js';

type Tx = Prisma.TransactionClient;

/** Transisi status pesanan yang diizinkan (selain pembatalan oleh sistem pembayaran). */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const STATUS_TEXT: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'menunggu pembayaran',
  PAID: 'sudah dibayar dan menunggu diproses penjual',
  PROCESSING: 'sedang diproses penjual',
  SHIPPED: 'sedang dikirim',
  DELIVERED: 'sudah sampai',
  COMPLETED: 'selesai',
  CANCELLED: 'dibatalkan',
};

/**
 * Satu-satunya tempat yang mengubah status pesanan & pembayaran.
 * Semua perubahan memakai transaksi database agar stok, pesanan, dan pembayaran selalu konsisten.
 */
@Injectable()
export class OrderWorkflowService {
  private readonly logger = new Logger('OrderWorkflow');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  /** Kembalikan stok untuk pesanan yang batal/kedaluwarsa. */
  private async releaseStock(tx: Tx, orderId: string, note: string) {
    const items = await tx.orderItem.findMany({ where: { orderId }, select: { variantId: true, productId: true, quantity: true } });
    for (const it of items) {
      await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
      await tx.product.update({ where: { id: it.productId }, data: { totalStock: { increment: it.quantity } } });
      await tx.inventoryMovement.create({ data: { variantId: it.variantId, delta: it.quantity, reason: 'ORDER_RELEASED', orderId, note } });
    }
  }

  private async releaseVoucher(tx: Tx, code: string | null) {
    if (code) await tx.voucher.updateMany({ where: { code, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
  }

  /**
   * Terapkan status pembayaran resmi (dari webhook terverifikasi / cek status ke penyedia).
   * Idempoten: memanggil berulang dengan status yang sama tidak mengubah apa pun.
   */
  async applyPaymentStatus(paymentId: string, next: 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED', info: { providerStatus?: string; paymentType?: string } = {}) {
    const result = await this.prisma.client.$transaction(async (tx) => {
      // Kunci baris pembayaran agar dua notifikasi bersamaan tidak diproses ganda
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} FOR UPDATE`;
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { orders: { select: { id: true, status: true, buyerId: true, storeId: true, orderNumber: true, voucherCode: true } } } });
      if (!payment) return null;
      if (payment.status === next) return { changed: false, payment };

      if (next === 'PAID') {
        if (payment.status !== 'PENDING') {
          // Dibayar setelah sistem membatalkan (mis. kedaluwarsa) -> perlu refund manual
          await tx.auditLog.create({ data: { action: 'payment.paid_after_cancel', entityType: 'Payment', entityId: payment.id, metadata: { previous: payment.status } } });
          await tx.payment.update({ where: { id: payment.id }, data: { providerStatus: info.providerStatus, paymentType: info.paymentType } });
          return { changed: false, payment, needsRefund: true };
        }
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: new Date(), providerStatus: info.providerStatus, paymentType: info.paymentType } });
        for (const o of payment.orders.filter((o) => o.status === 'PENDING_PAYMENT')) {
          await tx.order.update({ where: { id: o.id }, data: { status: 'PAID' } });
          await tx.orderEvent.create({ data: { orderId: o.id, status: 'PAID', note: 'Pembayaran dikonfirmasi oleh penyedia pembayaran' } });
          const items = await tx.orderItem.findMany({ where: { orderId: o.id }, select: { productId: true, quantity: true } });
          for (const it of items) await tx.product.update({ where: { id: it.productId }, data: { soldCount: { increment: it.quantity } } });
        }
        return { changed: true, payment };
      }

      if (next === 'FAILED' || next === 'EXPIRED') {
        if (payment.status !== 'PENDING') return { changed: false, payment };
        await tx.payment.update({ where: { id: payment.id }, data: { status: next, providerStatus: info.providerStatus } });
        for (const o of payment.orders.filter((o) => o.status === 'PENDING_PAYMENT')) {
          const reason = next === 'EXPIRED' ? 'Batas waktu pembayaran habis' : 'Pembayaran gagal atau dibatalkan';
          await tx.order.update({ where: { id: o.id }, data: { status: 'CANCELLED', cancelReason: reason } });
          await tx.orderEvent.create({ data: { orderId: o.id, status: 'CANCELLED', note: reason } });
          await this.releaseStock(tx, o.id, reason);
        }
        // Satu voucher per pembayaran (disimpan di setiap pesanan)
        await this.releaseVoucher(tx, payment.orders[0]?.voucherCode ?? null);
        return { changed: true, payment };
      }

      // REFUNDED: dana dikembalikan oleh penyedia; tandai & catat untuk admin
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED', providerStatus: info.providerStatus } });
      await tx.auditLog.create({ data: { action: 'payment.refunded', entityType: 'Payment', entityId: payment.id, metadata: {} } });
      return { changed: true, payment };
    });

    if (result?.changed) await this.notifyPayment(result.payment.id, next);
    return result;
  }

  private async notifyPayment(paymentId: string, status: string) {
    const payment = await this.prisma.client.payment.findUnique({
      where: { id: paymentId },
      include: { orders: { select: { id: true, orderNumber: true, buyerId: true, store: { select: { ownerId: true } } } } },
    });
    if (!payment) return;
    for (const o of payment.orders) {
      if (status === 'PAID') {
        await this.notifications.notify(o.buyerId, 'Pembayaran berhasil', `Pesanan ${o.orderNumber} sudah dibayar dan diteruskan ke penjual.`, `/orders/${o.id}`);
        await this.notifications.notify(o.store.ownerId, 'Pesanan baru 🎉', `Pesanan ${o.orderNumber} sudah dibayar. Segera proses ya!`, `/seller/orders`);
      } else if (status === 'FAILED' || status === 'EXPIRED') {
        await this.notifications.notify(o.buyerId, 'Pesanan dibatalkan', `Pesanan ${o.orderNumber} dibatalkan karena ${status === 'EXPIRED' ? 'batas waktu pembayaran habis' : 'pembayaran gagal'}.`, `/orders/${o.id}`);
      }
    }
  }

  /** Ubah status satu pesanan (oleh penjual, pembeli, admin, atau sistem). */
  async transition(orderId: string, to: OrderStatus, actor: { id?: string; role: 'seller' | 'buyer' | 'admin' | 'system' }, extra: { note?: string; trackingNumber?: string; courier?: string; cancelReason?: string } = {}) {
    const order = await this.prisma.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      const o = await tx.order.findUnique({ where: { id: orderId }, include: { shipment: true } });
      if (!o) throw new BadRequestException('Pesanan tidak ditemukan');
      if (!ALLOWED[o.status].includes(to)) throw new BadRequestException(`Pesanan yang ${STATUS_TEXT[o.status]} tidak bisa diubah menjadi ${STATUS_TEXT[to]}`);
      if (to === 'PAID') throw new BadRequestException('Status pembayaran hanya bisa diubah oleh sistem pembayaran');

      const data: Prisma.OrderUpdateInput = { status: to };
      if (to === 'SHIPPED') {
        if (!extra.trackingNumber) throw new BadRequestException('Nomor resi wajib diisi');
        await tx.shipment.update({
          where: { orderId },
          data: { status: 'IN_TRANSIT', trackingNumber: extra.trackingNumber, courier: extra.courier ?? o.shipment?.courier, shippedAt: new Date() },
        });
      }
      if (to === 'DELIVERED') await tx.shipment.update({ where: { orderId }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
      if (to === 'PROCESSING') await tx.shipment.update({ where: { orderId }, data: { status: 'READY_TO_SHIP' } });
      if (to === 'COMPLETED') data.payoutStatus = 'PENDING'; // dana siap dicairkan lewat mitra pembayaran
      if (to === 'CANCELLED') {
        data.cancelReason = extra.cancelReason ?? 'Dibatalkan';
        if (o.status !== 'PENDING_PAYMENT') {
          await this.releaseStock(tx, orderId, data.cancelReason as string);
          // Pesanan sudah dibayar -> dana harus dikembalikan lewat penyedia pembayaran
          await tx.auditLog.create({ data: { actorId: actor.id, action: 'order.refund_required', entityType: 'Order', entityId: orderId, metadata: { total: o.total, reason: data.cancelReason } } });
        }
      }
      const updated = await tx.order.update({ where: { id: orderId }, data });
      await tx.orderEvent.create({ data: { orderId, status: to, note: extra.note ?? extra.cancelReason, actorId: actor.id } });
      return updated;
    });

    await this.notifications.notify(order.buyerId, `Pesanan ${order.orderNumber}`, `Pesananmu ${STATUS_TEXT[order.status]}.`, `/orders/${order.id}`);
    if (actor.role === 'admin' && actor.id) {
      await this.audit.log({ actorId: actor.id, action: `order.${to.toLowerCase()}`, entityType: 'Order', entityId: orderId, metadata: { reason: extra.cancelReason ?? extra.note } });
    }
    if (to === 'CANCELLED' && order.status === 'CANCELLED') this.logger.log(`Pesanan ${order.orderNumber} dibatalkan oleh ${actor.role}`);
    return order;
  }
}
