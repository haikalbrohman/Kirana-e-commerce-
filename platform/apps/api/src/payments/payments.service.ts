import { ForbiddenException, Inject, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@shopia/db';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderWorkflowService } from '../orders/order-workflow.service.js';
import { mapProviderStatus, type PaymentGateway, type ProviderStatus } from './gateway.js';
import { MidtransGateway } from './midtrans.gateway.js';
import { MockGateway } from './mock.gateway.js';

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Payments');
  readonly gateway: PaymentGateway;
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: OrderWorkflowService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    const p = config.payment;
    this.gateway = p.provider === 'midtrans' ? new MidtransGateway(p.midtrans.serverKey, p.midtrans.isProduction) : new MockGateway(p.mockServerKey, config.webOrigin);
  }

  onModuleInit() {
    if (process.env.SHOPIA_DISABLE_SWEEP === '1') return;
    // Periksa pembayaran kedaluwarsa & pesanan terkirim setiap 5 menit
    this.sweepTimer = setInterval(() => this.sweep().catch((e) => this.logger.error(e)), 5 * 60_000);
  }

  onModuleDestroy() {
    clearInterval(this.sweepTimer);
  }

  /**
   * Proses notifikasi webhook. Urutan pengamanan:
   * 1) verifikasi tanda tangan, 2) catat event unik (idempoten),
   * 3) cek ulang status langsung ke penyedia, 4) cocokkan nominal, 5) terapkan status.
   */
  async handleNotification(body: Record<string, any>) {
    const valid = this.gateway.verifySignature(body);
    const orderId = String(body.order_id ?? '');
    const eventKey = [this.gateway.name, orderId, body.transaction_id ?? '', body.transaction_status ?? '', body.status_code ?? ''].join(':');
    const payment = orderId ? await this.prisma.client.payment.findUnique({ where: { providerOrderId: orderId } }) : null;

    let event;
    try {
      event = await this.prisma.client.paymentEvent.create({
        data: { provider: this.gateway.name, eventKey: valid ? eventKey : `${eventKey}:invalid:${Date.now()}`, paymentId: payment?.id, signatureValid: valid, payload: redact(body) },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { ok: true, duplicate: true };
      throw e;
    }

    if (!valid) {
      this.logger.warn(`Tanda tangan webhook tidak valid untuk order_id=${orderId}`);
      throw new ForbiddenException('Tanda tangan tidak valid');
    }
    if (!payment) {
      this.logger.warn(`Webhook untuk pembayaran tidak dikenal: ${orderId}`);
      return { ok: true };
    }

    // Jangan percaya isi webhook begitu saja: ambil status resmi dari penyedia
    const status: ProviderStatus | null = (await this.gateway.fetchStatus(orderId)) ?? {
      orderId,
      transactionStatus: body.transaction_status,
      fraudStatus: body.fraud_status,
      grossAmount: Math.round(Number(body.gross_amount)),
      paymentType: body.payment_type,
    };
    await this.applyProviderStatus(payment.id, payment.amount, status);
    await this.prisma.client.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    return { ok: true };
  }

  private async applyProviderStatus(paymentId: string, expectedAmount: number, status: ProviderStatus) {
    if (status.grossAmount !== expectedAmount) {
      this.logger.error(`Nominal tidak cocok untuk ${status.orderId}: ${status.grossAmount} != ${expectedAmount}`);
      await this.prisma.client.auditLog.create({ data: { action: 'payment.amount_mismatch', entityType: 'Payment', entityId: paymentId, metadata: { received: status.grossAmount, expected: expectedAmount } } });
      return;
    }
    const mapped = mapProviderStatus(status);
    if (!mapped || mapped === 'PENDING') {
      await this.prisma.client.payment.update({ where: { id: paymentId }, data: { providerStatus: status.transactionStatus, paymentType: status.paymentType } });
      return;
    }
    await this.workflow.applyPaymentStatus(paymentId, mapped, { providerStatus: status.transactionStatus, paymentType: status.paymentType });
  }

  /** Untuk halaman "menunggu pembayaran": status dari database (bukan dari redirect browser). */
  async getForUser(userId: string, paymentId: string) {
    const p = await this.prisma.client.payment.findFirst({
      where: { id: paymentId, userId },
      select: { id: true, status: true, amount: true, redirectUrl: true, snapToken: true, expiresAt: true, paidAt: true, paymentType: true, provider: true, providerOrderId: true, orders: { select: { id: true, orderNumber: true, status: true } } },
    });
    if (!p) throw new NotFoundException('Pembayaran tidak ditemukan');
    return p;
  }

  /** Pembeli membatalkan pembayaran yang belum dibayar. */
  async cancelByBuyer(userId: string, paymentId: string) {
    const p = await this.prisma.client.payment.findFirst({ where: { id: paymentId, userId } });
    if (!p) throw new NotFoundException('Pembayaran tidak ditemukan');
    if (p.status !== 'PENDING') return this.getForUser(userId, paymentId);
    // Pastikan belum dibayar di penyedia sebelum membatalkan
    const status = await this.gateway.fetchStatus(p.providerOrderId);
    if (status && mapProviderStatus(status) === 'PAID') {
      await this.applyProviderStatus(p.id, p.amount, status);
      return this.getForUser(userId, paymentId);
    }
    await this.gateway.cancel(p.providerOrderId);
    await this.workflow.applyPaymentStatus(p.id, 'FAILED', { providerStatus: 'cancel_by_buyer' });
    return this.getForUser(userId, paymentId);
  }

  /** Mode mock: simulasikan notifikasi Midtrans bertanda tangan. Tidak tersedia di production. */
  async simulate(userId: string, providerOrderId: string, result: 'settlement' | 'deny' | 'expire') {
    if (!(this.gateway instanceof MockGateway) || this.config.isProduction) throw new ForbiddenException('Simulasi hanya untuk mode pengembangan');
    const p = await this.prisma.client.payment.findFirst({ where: { providerOrderId, userId } });
    if (!p) throw new NotFoundException('Pembayaran tidak ditemukan');
    const body = this.gateway.buildNotification(providerOrderId, result, p.amount);
    await this.handleNotification(body);
    return this.getForUser(userId, p.id);
  }

  /** Tugas berkala: pembayaran kedaluwarsa & pesanan terkirim yang lupa dikonfirmasi. */
  async sweep() {
    const overdue = await this.prisma.client.payment.findMany({ where: { status: 'PENDING', expiresAt: { lt: new Date(Date.now() - 5 * 60_000) } }, take: 50 });
    for (const p of overdue) {
      const status = await this.gateway.fetchStatus(p.providerOrderId).catch(() => null);
      const mapped = status ? mapProviderStatus(status) : null;
      if (status && mapped && mapped !== 'PENDING') await this.applyProviderStatus(p.id, p.amount, status);
      else await this.workflow.applyPaymentStatus(p.id, 'EXPIRED', { providerStatus: status?.transactionStatus ?? 'expired_by_shopia' });
    }
    // Pesanan "sudah sampai" otomatis selesai setelah 3 hari
    const delivered = await this.prisma.client.order.findMany({ where: { status: 'DELIVERED', shipment: { deliveredAt: { lt: new Date(Date.now() - 3 * 864e5) } } }, select: { id: true }, take: 100 });
    for (const o of delivered) await this.workflow.transition(o.id, 'COMPLETED', { role: 'system' }, { note: 'Selesai otomatis 3 hari setelah barang sampai' }).catch(() => null);
    return { expired: overdue.length, autoCompleted: delivered.length };
  }
}

/** Simpan payload webhook tanpa data sensitif yang tidak perlu. */
function redact(body: Record<string, any>) {
  const { signature_key: _sig, masked_card: _card, va_numbers: _va, ...rest } = body ?? {};
  return rest as object;
}
