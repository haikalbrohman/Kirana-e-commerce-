import { BadGatewayException, BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Voucher } from '@shopia/db';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { orderNumber } from '../common/util.js';
import { PaymentsService } from '../payments/payments.service.js';
import { OrderWorkflowService } from '../orders/order-workflow.service.js';
import { DEFAULT_SHIPPING, shippingCost, shippingQuotes } from './shipping.js';

export interface CheckoutInput {
  addressId?: string;
  shipping?: Record<string, string>; // storeId -> id opsi pengiriman
  voucherCode?: string;
  notes?: Record<string, string>; // storeId -> catatan
  idempotencyKey?: string;
}

/**
 * Semua harga, ongkir, dan diskon DIHITUNG DI SERVER dari database.
 * Browser hanya mengirim pilihan (alamat, kurir, kode voucher).
 */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger('Checkout');

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly workflow: OrderWorkflowService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private async loadCart(userId: string) {
    const cart = await this.prisma.client.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true, name: true, status: true,
                    images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
                    store: { select: { id: true, name: true, slug: true, status: true, ownerId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    const items = cart?.items ?? [];
    if (!items.length) throw new BadRequestException('Keranjang masih kosong');
    for (const it of items) {
      const v = it.variant;
      if (v.product.status !== 'ACTIVE' || v.product.store.status !== 'ACTIVE' || !v.isActive)
        throw new ConflictException(`"${v.product.name}" sudah tidak tersedia. Hapus dari keranjang untuk melanjutkan.`);
      if (it.quantity > v.stock) throw new ConflictException(`Stok "${v.product.name} (${v.name})" tersisa ${v.stock}`);
      if (v.product.store.ownerId === userId) throw new BadRequestException('Tidak bisa membeli produk dari toko sendiri');
    }
    return items;
  }

  private async findVoucher(code?: string) {
    if (!code) return null;
    const v = await this.prisma.client.voucher.findUnique({ where: { code: code.trim().toUpperCase() } });
    const now = new Date();
    if (!v || !v.isActive || v.startsAt > now || (v.endsAt && v.endsAt < now)) throw new BadRequestException('Kode voucher tidak valid atau sudah berakhir');
    if (v.quota !== null && v.usedCount >= v.quota) throw new BadRequestException('Kuota voucher sudah habis');
    return v;
  }

  /** Hitung ringkasan checkout (dipakai untuk pratinjau & saat membuat pesanan). */
  async quote(userId: string, input: CheckoutInput) {
    const items = await this.loadCart(userId);
    const voucher = await this.findVoucher(input.voucherCode).catch((e) => {
      if (input.voucherCode) throw e;
      return null;
    });

    const byStore = new Map<string, typeof items>();
    for (const it of items) {
      const sid = it.variant.product.store.id;
      byStore.set(sid, [...(byStore.get(sid) ?? []), it]);
    }

    const groups = [...byStore.entries()].map(([storeId, list]) => {
      const store = list[0].variant.product.store;
      const subtotal = list.reduce((s, it) => s + it.variant.price * it.quantity, 0);
      const weight = list.reduce((s, it) => s + it.variant.weightGram * it.quantity, 0);
      const optionId = input.shipping?.[storeId] ?? DEFAULT_SHIPPING;
      const ship = shippingCost(optionId, weight);
      if (!ship) throw new BadRequestException('Pilihan pengiriman tidak valid');
      return {
        store: { id: store.id, name: store.name, slug: store.slug },
        items: list.map((it) => ({
          variantId: it.variantId,
          productId: it.variant.product.id,
          productName: it.variant.product.name,
          variantName: it.variant.name,
          imageUrl: it.variant.product.images[0]?.url ?? null,
          unitPrice: it.variant.price,
          quantity: it.quantity,
          lineTotal: it.variant.price * it.quantity,
        })),
        subtotal,
        weightGram: weight,
        shipping: ship,
        shippingOptions: shippingQuotes(weight),
        discount: 0,
        note: input.notes?.[storeId]?.slice(0, 200) ?? null,
      };
    });

    const subtotal = groups.reduce((s, g) => s + g.subtotal, 0);
    const shippingTotal = groups.reduce((s, g) => s + g.shipping.cost, 0);
    let voucherError: string | null = null;
    let discountTotal = 0;
    if (voucher) {
      if (subtotal < voucher.minSpend) voucherError = `Minimal belanja Rp${voucher.minSpend.toLocaleString('id-ID')} untuk voucher ini`;
      else discountTotal = computeDiscount(voucher, subtotal, shippingTotal);
    }
    // Bagi diskon ke tiap toko secara proporsional agar total tiap pesanan tetap benar
    let remaining = discountTotal;
    groups.forEach((g, i) => {
      const base = voucher?.type === 'FREE_SHIPPING' ? g.shipping.cost : g.subtotal;
      const totalBase = voucher?.type === 'FREE_SHIPPING' ? shippingTotal : subtotal;
      const share = i === groups.length - 1 ? remaining : Math.floor((discountTotal * base) / Math.max(totalBase, 1));
      g.discount = Math.min(share, g.subtotal + g.shipping.cost);
      remaining -= g.discount;
    });

    return {
      groups,
      subtotal,
      shippingTotal,
      discountTotal,
      total: subtotal + shippingTotal - discountTotal,
      voucher: voucher ? { code: voucher.code, description: voucher.description, applied: !voucherError && discountTotal > 0, error: voucherError } : null,
      shippingNote: 'Ongkir adalah tarif perkiraan berdasarkan berat. Integrasi ongkir real-time belum diaktifkan.',
    };
  }

  /** Buat pesanan + pembayaran. Stok dipotong secara atomik di dalam transaksi database. */
  async create(userId: string, input: CheckoutInput) {
    if (!input.addressId) throw new BadRequestException('Pilih alamat pengiriman');
    if (input.idempotencyKey) {
      const existing = await this.prisma.client.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) {
        if (existing.userId !== userId) throw new ConflictException('Permintaan tidak valid');
        return { paymentId: existing.id, redirectUrl: existing.redirectUrl, snapToken: existing.snapToken, status: existing.status, reused: true };
      }
    }

    const address = await this.prisma.client.address.findFirst({ where: { id: input.addressId, userId } });
    if (!address) throw new NotFoundException('Alamat tidak ditemukan');
    const quote = await this.quote(userId, input);
    if (quote.voucher && !quote.voucher.applied) throw new BadRequestException(quote.voucher.error ?? 'Voucher tidak dapat dipakai');
    const user = await this.prisma.client.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, phone: true } });

    const addressSnapshot = { recipientName: address.recipientName, phone: address.phone, line1: address.line1, city: address.city, province: address.province, postalCode: address.postalCode };
    const providerOrderId = `SHOPIA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + this.config.payment.expiryMinutes * 60_000);

    const payment = await this.prisma.client.$transaction(async (tx) => {
      // 1) Potong stok hanya jika masih cukup (aman dari pembelian bersamaan)
      for (const g of quote.groups) {
        for (const it of g.items) {
          const res = await tx.productVariant.updateMany({
            where: { id: it.variantId, isActive: true, stock: { gte: it.quantity }, price: it.unitPrice },
            data: { stock: { decrement: it.quantity } },
          });
          if (res.count === 0) throw new ConflictException(`Stok atau harga "${it.productName} (${it.variantName})" berubah. Muat ulang keranjang.`);
          await tx.product.update({ where: { id: it.productId }, data: { totalStock: { decrement: it.quantity } } });
        }
      }
      // 2) Pakai kuota voucher secara atomik
      if (quote.voucher?.applied) {
        const used = await tx.voucher.updateMany({
          where: { code: quote.voucher.code, isActive: true, OR: [{ quota: null }, { usedCount: { lt: tx.voucher.fields.quota } }] },
          data: { usedCount: { increment: 1 } },
        });
        if (used.count === 0) throw new ConflictException('Kuota voucher baru saja habis');
      }
      // 3) Pembayaran + pesanan per toko (dengan snapshot harga & alamat)
      const payment = await tx.payment.create({
        data: { userId, provider: this.payments.gateway.name, providerOrderId, amount: quote.total, expiresAt, idempotencyKey: input.idempotencyKey },
      });
      for (const g of quote.groups) {
        const order = await tx.order.create({
          data: {
            orderNumber: orderNumber(),
            buyerId: userId,
            storeId: g.store.id,
            paymentId: payment.id,
            addressSnapshot,
            subtotal: g.subtotal,
            shippingCost: g.shipping.cost,
            discount: g.discount,
            total: g.subtotal + g.shipping.cost - g.discount,
            voucherCode: quote.voucher?.applied ? quote.voucher.code : null,
            note: g.note,
            items: { create: g.items.map(({ variantId, productId, productName, variantName, imageUrl, unitPrice, quantity, lineTotal }) => ({ variantId, productId, productName, variantName, imageUrl, unitPrice, quantity, lineTotal })) },
            shipment: { create: { courier: g.shipping.courier, service: g.shipping.service, cost: g.shipping.cost, etaText: g.shipping.eta } },
            events: { create: { status: 'PENDING_PAYMENT', note: 'Pesanan dibuat, menunggu pembayaran' } },
          },
        });
        for (const it of g.items)
          await tx.inventoryMovement.create({ data: { variantId: it.variantId, delta: -it.quantity, reason: 'ORDER_RESERVED', orderId: order.id, actorId: userId } });
      }
      // 4) Kosongkan keranjang
      await tx.cartItem.deleteMany({ where: { cart: { userId } } });
      return payment;
    });

    // 5) Buat transaksi di penyedia pembayaran (di luar transaksi DB)
    try {
      const lines = quote.groups.flatMap((g) => [
        ...g.items.map((it) => ({ id: it.variantId, name: it.productName, price: it.unitPrice, quantity: it.quantity })),
        { id: `ship-${g.store.id}`, name: `Ongkir ${g.shipping.courier} ${g.shipping.service} (${g.store.name})`, price: g.shipping.cost, quantity: 1 },
      ]);
      if (quote.discountTotal) lines.push({ id: 'discount', name: `Voucher ${quote.voucher?.code}`, price: -quote.discountTotal, quantity: 1 });
      const tr = await this.payments.gateway.createTransaction({
        providerOrderId,
        amount: quote.total,
        customer: { name: user.name ?? address.recipientName, email: user.email, phone: address.phone },
        lines,
        expiryMinutes: this.config.payment.expiryMinutes,
        finishUrl: `${this.config.webOrigin}/payments/${payment.id}`,
      });
      await this.prisma.client.payment.update({ where: { id: payment.id }, data: { snapToken: tr.token, redirectUrl: tr.redirectUrl } });
      return { paymentId: payment.id, redirectUrl: tr.redirectUrl, snapToken: tr.token, status: 'PENDING' as const, reused: false };
    } catch (e) {
      this.logger.error(`Gagal membuat transaksi pembayaran: ${(e as Error).message}`);
      // Batalkan pesanan & kembalikan stok agar tidak "tergantung"
      await this.workflow.applyPaymentStatus(payment.id, 'FAILED', { providerStatus: 'gateway_error' });
      throw new BadGatewayException('Layanan pembayaran sedang bermasalah. Pesanan dibatalkan dan stok dikembalikan, silakan coba lagi.');
    }
  }
}

function computeDiscount(v: Voucher, subtotal: number, shipping: number) {
  if (v.type === 'PERCENT') return Math.min(Math.floor((subtotal * v.value) / 100), v.maxDiscount ?? Infinity);
  if (v.type === 'FIXED') return Math.min(v.value, subtotal);
  return Math.min(shipping, v.maxDiscount ?? shipping);
}
