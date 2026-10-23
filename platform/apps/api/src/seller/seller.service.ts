import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@shopia/db';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit.service.js';
import { slugify } from '../common/util.js';
import { StorageService } from '../storage/storage.service.js';
import { OrderWorkflowService } from '../orders/order-workflow.service.js';
import type { ProductDto, StoreDto } from './seller.dto.js';

const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] as const;

@Injectable()
export class SellerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly workflow: OrderWorkflowService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Toko milik pengguna (wajib ada untuk fitur penjual). */
  async myStore(userId: string) {
    const store = await this.prisma.client.store.findUnique({ where: { ownerId: userId } });
    if (!store) throw new NotFoundException('Kamu belum punya toko. Buka toko terlebih dahulu.');
    return store;
  }

  /** Buka toko: status PENDING sampai disetujui admin. */
  async openStore(userId: string, dto: StoreDto) {
    const exists = await this.prisma.client.store.findUnique({ where: { ownerId: userId } });
    if (exists) throw new ConflictException('Kamu sudah punya toko');
    let slug = slugify(dto.name);
    if (await this.prisma.client.store.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    const store = await this.prisma.client.$transaction(async (tx) => {
      const s = await tx.store.create({ data: { ...dto, slug, ownerId: userId, status: 'PENDING' } });
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { roles: true } });
      if (!user.roles.includes('SELLER')) await tx.user.update({ where: { id: userId }, data: { roles: { push: 'SELLER' } } });
      return s;
    });
    await this.audit.log({ actorId: userId, action: 'store.open', entityType: 'Store', entityId: store.id });
    return store;
  }

  async updateStore(userId: string, dto: StoreDto) {
    const store = await this.myStore(userId);
    return this.prisma.client.store.update({ where: { id: store.id }, data: { name: dto.name, description: dto.description, city: dto.city, isUmkm: dto.isUmkm, logoUrl: dto.logoUrl } });
  }

  // ------------------------------------------------------------------ produk

  async products(userId: string, status?: string, q?: string) {
    const store = await this.myStore(userId);
    return this.prisma.client.product.findMany({
      where: { storeId: store.id, ...(status ? { status: status as any } : { status: { not: 'ARCHIVED' } }), ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      orderBy: { updatedAt: 'desc' },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, category: { select: { name: true } }, _count: { select: { variants: { where: { isActive: true } } } } },
      take: 200,
    });
  }

  async product(userId: string, id: string) {
    const store = await this.myStore(userId);
    const p = await this.prisma.client.product.findFirst({
      where: { id, storeId: store.id },
      include: { images: { orderBy: { sortOrder: 'asc' } }, variants: { where: { isActive: true }, orderBy: { createdAt: 'asc' } }, category: true },
    });
    if (!p) throw new NotFoundException('Produk tidak ditemukan');
    return p;
  }

  private validate(dto: ProductDto) {
    for (const img of dto.images) {
      if (!img.url.startsWith(this.storage.publicPrefix)) throw new BadRequestException('Foto harus diupload melalui Shopia');
    }
    for (const v of dto.variants) {
      if (v.compareAtPrice && v.compareAtPrice <= v.price) throw new BadRequestException(`Harga coret varian "${v.name}" harus lebih tinggi dari harga jual`);
    }
    const attrs = Object.entries(dto.attributes ?? {});
    if (attrs.length > 20 || attrs.some(([k, v]) => typeof v !== 'string' || k.length > 40 || v.length > 200)) throw new BadRequestException('Spesifikasi maksimal 20 baris (nama ≤ 40, isi ≤ 200 karakter)');
    const names = dto.variants.map((v) => v.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) throw new BadRequestException('Nama varian tidak boleh sama');
  }

  /** Buat / perbarui produk beserta foto & varian dalam satu transaksi. */
  async saveProduct(userId: string, dto: ProductDto, id?: string) {
    const store = await this.myStore(userId);
    if (store.status === 'SUSPENDED') throw new ForbiddenException('Toko sedang dinonaktifkan admin');
    this.validate(dto);
    const category = await this.prisma.client.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Kategori tidak valid');

    const existing = id ? await this.prisma.client.product.findFirst({ where: { id, storeId: store.id }, include: { variants: true } }) : null;
    if (id && !existing) throw new NotFoundException('Produk tidak ditemukan');
    if (existing?.status === 'REJECTED' && dto.status === 'ACTIVE') throw new ForbiddenException('Produk ini diturunkan admin. Perbaiki sesuai catatan moderasi lalu hubungi admin.');

    const tags = [...new Set((dto.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))];
    const data = {
      name: dto.name.trim(),
      description: dto.description.trim(),
      categoryId: dto.categoryId,
      attributes: (dto.attributes ?? {}) as Prisma.InputJsonValue,
      tags,
      status: existing?.status === 'REJECTED' ? ('REJECTED' as const) : dto.status,
    };

    const productId = await this.prisma.client.$transaction(async (tx) => {
      let pid: string;
      if (existing) {
        pid = existing.id;
        await tx.product.update({ where: { id: pid }, data });
        await tx.productImage.deleteMany({ where: { productId: pid } });
      } else {
        let slug = slugify(dto.name);
        if (await tx.product.findUnique({ where: { storeId_slug: { storeId: store.id, slug } } })) slug = `${slug}-${Date.now().toString(36).slice(-5)}`;
        pid = (await tx.product.create({ data: { ...data, slug, storeId: store.id } })).id;
      }
      if (dto.images.length) await tx.productImage.createMany({ data: dto.images.map((img, i) => ({ productId: pid, url: img.url, alt: img.alt ?? dto.name, sortOrder: i })) });

      const keep = new Set<string>();
      for (const v of dto.variants) {
        const values = {
          name: v.name.trim(), options: (v.options ?? {}) as Prisma.InputJsonValue, sku: v.sku, price: v.price,
          compareAtPrice: v.compareAtPrice || null, stock: v.stock, weightGram: v.weightGram ?? 500, isActive: v.isActive ?? true,
        };
        const old = v.id ? existing?.variants.find((x) => x.id === v.id) : undefined;
        if (v.id && !old) throw new BadRequestException('Varian tidak valid');
        if (old) {
          await tx.productVariant.update({ where: { id: old.id }, data: values });
          const delta = v.stock - old.stock;
          if (delta) await tx.inventoryMovement.create({ data: { variantId: old.id, delta, reason: delta > 0 ? 'RESTOCK' : 'ADJUSTMENT', actorId: userId } });
          keep.add(old.id);
        } else {
          const created = await tx.productVariant.create({ data: { ...values, productId: pid } });
          if (v.stock) await tx.inventoryMovement.create({ data: { variantId: created.id, delta: v.stock, reason: 'INITIAL', actorId: userId } });
          keep.add(created.id);
        }
      }
      // Varian yang dihapus dinonaktifkan (tidak dihapus karena bisa terkait pesanan lama)
      await tx.productVariant.updateMany({ where: { productId: pid, id: { notIn: [...keep] } }, data: { isActive: false } });
      const agg = await tx.productVariant.aggregate({ where: { productId: pid, isActive: true }, _min: { price: true }, _sum: { stock: true } });
      await tx.product.update({ where: { id: pid }, data: { minPrice: agg._min.price ?? 0, totalStock: agg._sum.stock ?? 0 } });
      return pid;
    });
    return this.product(userId, productId);
  }

  async setStatus(userId: string, id: string, status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED') {
    const store = await this.myStore(userId);
    const p = await this.prisma.client.product.findFirst({ where: { id, storeId: store.id } });
    if (!p) throw new NotFoundException('Produk tidak ditemukan');
    if (p.status === 'REJECTED') throw new ForbiddenException('Produk ini diturunkan admin');
    if (status === 'ACTIVE' && p.totalStock <= 0) throw new BadRequestException('Isi stok terlebih dahulu sebelum menampilkan produk');
    return this.prisma.client.product.update({ where: { id }, data: { status } });
  }

  async upload(userId: string, file?: { buffer: Buffer; size: number }) {
    const store = await this.myStore(userId);
    if (!file?.buffer) throw new BadRequestException('Pilih foto terlebih dahulu');
    return this.storage.saveImage(file.buffer, `products/${store.id}`);
  }

  // ----------------------------------------------------------------- pesanan

  async orders(userId: string, status?: string) {
    const store = await this.myStore(userId);
    return this.prisma.client.order.findMany({
      where: { storeId: store.id, status: status ? (status as any) : { not: 'PENDING_PAYMENT' } },
      orderBy: { createdAt: 'desc' },
      include: { items: true, shipment: true, buyer: { select: { name: true } } },
      take: 100,
    });
  }

  private async ownOrder(userId: string, orderId: string) {
    const store = await this.myStore(userId);
    const o = await this.prisma.client.order.findFirst({ where: { id: orderId, storeId: store.id }, select: { id: true } });
    if (!o) throw new NotFoundException('Pesanan tidak ditemukan');
  }

  async process(userId: string, orderId: string) {
    await this.ownOrder(userId, orderId);
    return this.workflow.transition(orderId, 'PROCESSING', { id: userId, role: 'seller' }, { note: 'Pesanan diproses penjual' });
  }

  async ship(userId: string, orderId: string, trackingNumber: string, courier?: string) {
    await this.ownOrder(userId, orderId);
    return this.workflow.transition(orderId, 'SHIPPED', { id: userId, role: 'seller' }, { trackingNumber, courier, note: `Dikirim dengan resi ${trackingNumber}` });
  }

  async markDelivered(userId: string, orderId: string) {
    await this.ownOrder(userId, orderId);
    return this.workflow.transition(orderId, 'DELIVERED', { id: userId, role: 'seller' }, { note: 'Ditandai sampai oleh penjual' });
  }

  // ------------------------------------------------------- laporan & insight

  /** Ringkasan penjualan, grafik harian, produk terlaris, stok menipis, dan perkiraan pendapatan. */
  async stats(userId: string, days = 30) {
    const store = await this.myStore(userId);
    const since = new Date(Date.now() - days * 864e5);
    since.setHours(0, 0, 0, 0);
    const orders = await this.prisma.client.order.findMany({
      where: { storeId: store.id, status: { in: [...PAID_STATUSES] }, payment: { paidAt: { gte: since } } },
      select: { subtotal: true, shippingCost: true, discount: true, total: true, payoutStatus: true, payment: { select: { paidAt: true } }, items: { select: { productId: true, productName: true, quantity: true, lineTotal: true } } },
    });

    const series = new Map<string, { date: string; revenue: number; orders: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 864e5).toISOString().slice(0, 10);
      series.set(d, { date: d, revenue: 0, orders: 0 });
    }
    const top = new Map<string, { productId: string; name: string; quantity: number; revenue: number }>();
    let gross = 0, shipping = 0, discount = 0, items = 0;
    for (const o of orders) {
      const d = o.payment.paidAt!.toISOString().slice(0, 10);
      const day = series.get(d);
      if (day) {
        day.revenue += o.subtotal;
        day.orders += 1;
      }
      gross += o.subtotal;
      shipping += o.shippingCost;
      discount += o.discount;
      for (const it of o.items) {
        items += it.quantity;
        const t = top.get(it.productId) ?? { productId: it.productId, name: it.productName, quantity: 0, revenue: 0 };
        t.quantity += it.quantity;
        t.revenue += it.lineTotal;
        top.set(it.productId, t);
      }
    }
    const platformFee = Math.round((gross * this.config.platformFeePercent) / 100);
    const [statusCounts, lowStock, payouts] = await Promise.all([
      this.prisma.client.order.groupBy({ by: ['status'], where: { storeId: store.id }, _count: true }),
      this.prisma.client.productVariant.findMany({
        where: { isActive: true, stock: { lte: 5 }, product: { storeId: store.id, status: 'ACTIVE' } },
        select: { id: true, name: true, stock: true, product: { select: { id: true, name: true } } },
        orderBy: { stock: 'asc' },
        take: 10,
      }),
      this.prisma.client.order.groupBy({ by: ['payoutStatus'], where: { storeId: store.id, payoutStatus: { in: ['PENDING', 'PAID_OUT'] } }, _sum: { subtotal: true } }),
    ]);

    return {
      store: { id: store.id, name: store.name, status: store.status },
      days,
      series: [...series.values()],
      totals: {
        grossSales: gross,
        orders: orders.length,
        itemsSold: items,
        avgOrderValue: orders.length ? Math.round(gross / orders.length) : 0,
        shippingCollected: shipping,
        discounts: discount,
        platformFeePercent: this.config.platformFeePercent,
        platformFee,
        netEstimate: gross - platformFee,
      },
      statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
      topProducts: [...top.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      lowStock,
      payouts: {
        pending: payouts.find((p) => p.payoutStatus === 'PENDING')?._sum.subtotal ?? 0,
        paidOut: payouts.find((p) => p.payoutStatus === 'PAID_OUT')?._sum.subtotal ?? 0,
      },
    };
  }

  /** Sebaran harga produk aktif di kategori yang sama (dasar saran harga, tanpa AI mengarang). */
  async priceInsight(categoryId: string, excludeProductId?: string) {
    const rows = await this.prisma.client.product.findMany({
      where: { categoryId, status: 'ACTIVE', store: { status: 'ACTIVE' }, ...(excludeProductId ? { id: { not: excludeProductId } } : {}) },
      select: { minPrice: true },
      orderBy: { minPrice: 'asc' },
    });
    const prices = rows.map((r) => r.minPrice).filter((p) => p > 0);
    if (prices.length < 3) return { sampleSize: prices.length, enoughData: false };
    const q = (p: number) => prices[Math.min(prices.length - 1, Math.floor(p * (prices.length - 1)))];
    return { sampleSize: prices.length, enoughData: true, min: prices[0], p25: q(0.25), median: q(0.5), p75: q(0.75), max: prices[prices.length - 1] };
  }
}
