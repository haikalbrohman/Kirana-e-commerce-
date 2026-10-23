import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@shopia/db';
import { PrismaService } from '../prisma/prisma.service.js';
import { validCompareAt } from '../common/util.js';
import type { ProductQueryDto, Sort } from './catalog.dto.js';
import { productCardInclude, toProductCard, type ProductCard } from './product.presenter.js';

// Kata umum yang tidak dipakai untuk pencarian kata kunci
const STOPWORDS = new Set(
  'yang dan atau di ke dari untuk buat dengan saya aku mau cari carikan ingin tolong dong ya kak yg utk ada harga rp ribu rb jt juta budget bawah atas maks maksimal minimal murah termurah terlaris terbaru bagus terbaik produk barang'.split(' '),
);

export function keywordsFrom(q?: string): string[] {
  return (q ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .slice(0, 8);
}

/** Produk yang boleh tampil ke pembeli: aktif & tokonya aktif */
export const visibleProduct: Prisma.ProductWhereInput = { status: 'ACTIVE', store: { status: 'ACTIVE' } };

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  categories() {
    return this.prisma.client.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, icon: true },
    });
  }

  /** Daftar produk dengan filter, urutan, dan pencarian kata kunci. */
  async search(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const words = keywordsFrom(query.q);

    const base: Prisma.ProductWhereInput = {
      ...visibleProduct,
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.store ? { store: { status: 'ACTIVE', slug: query.store } } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? { minPrice: { ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}), ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}) } }
        : {}),
      ...(query.minRating ? { ratingAvg: { gte: query.minRating } } : {}),
      ...(query.ids ? { id: { in: query.ids.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4) } } : {}),
    };

    const wordMatch = (w: string): Prisma.ProductWhereInput => ({
      OR: [
        { name: { contains: w, mode: 'insensitive' } },
        { tags: { has: w } },
        { description: { contains: w, mode: 'insensitive' } },
        { category: { name: { contains: w, mode: 'insensitive' } } },
        { store: { name: { contains: w, mode: 'insensitive' } } },
      ],
    });

    // Semua kata harus cocok; jika kosong, longgarkan ke "salah satu kata cocok"
    let where: Prisma.ProductWhereInput = words.length ? { AND: [base, ...words.map(wordMatch)] } : base;
    let total = await this.prisma.client.product.count({ where });
    let relaxed = false;
    if (!total && words.length > 1) {
      where = { AND: [base, { OR: words.map(wordMatch) }] };
      total = await this.prisma.client.product.count({ where });
      relaxed = total > 0;
    }

    const sort: Sort = query.sort ?? (words.length ? 'relevance' : 'popular');
    let items: ProductCard[];
    if (sort === 'relevance' && words.length) {
      // Peringkat relevansi dihitung dari 300 kandidat teratas (cukup untuk katalog MVP;
      // untuk katalog besar gunakan full-text search / vector search)
      const rows = await this.prisma.client.product.findMany({ where, include: productCardInclude, take: 300, orderBy: { soldCount: 'desc' } });
      const scored = rows.map((p) => {
        const name = p.name.toLowerCase();
        let score = 0;
        for (const w of words) {
          if (name.includes(w)) score += 3;
          if (p.tags.some((t) => t.includes(w))) score += 2;
          if (p.description.toLowerCase().includes(w)) score += 1;
        }
        return { p, score: score + Math.log10(p.soldCount + 1) * 0.3 + p.ratingAvg * 0.1 };
      });
      scored.sort((a, b) => b.score - a.score);
      items = scored.slice((page - 1) * limit, page * limit).map((x) => toProductCard(x.p));
    } else {
      const orderBy: Prisma.ProductOrderByWithRelationInput[] = {
        relevance: [{ soldCount: 'desc' as const }],
        popular: [{ soldCount: 'desc' as const }, { ratingAvg: 'desc' as const }],
        newest: [{ createdAt: 'desc' as const }],
        price_asc: [{ minPrice: 'asc' as const }],
        price_desc: [{ minPrice: 'desc' as const }],
        rating: [{ ratingAvg: 'desc' as const }, { ratingCount: 'desc' as const }],
      }[sort];
      const rows = await this.prisma.client.product.findMany({ where, include: productCardInclude, orderBy, skip: (page - 1) * limit, take: limit });
      items = rows.map(toProductCard);
    }

    return { items, total, page, limit, keywords: words, relaxed };
  }

  /** Detail produk lengkap untuk halaman produk. */
  async detail(id: string) {
    const p = await this.prisma.client.product.findFirst({
      where: { id, ...visibleProduct },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true }, orderBy: { price: 'asc' } },
        category: { select: { name: true, slug: true, icon: true } },
        store: {
          select: {
            id: true, name: true, slug: true, city: true, isUmkm: true, logoUrl: true, createdAt: true,
            _count: { select: { products: { where: { status: 'ACTIVE' } } } },
          },
        },
        reviews: {
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { name: true } }, orderItem: { select: { variantName: true } } },
        },
      },
    });
    if (!p) throw new NotFoundException('Produk tidak ditemukan atau sudah tidak dijual');

    const ratingBreakdown = await this.prisma.client.review.groupBy({
      by: ['rating'],
      where: { productId: id, status: 'PUBLISHED' },
      _count: true,
    });

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      attributes: p.attributes as Record<string, string>,
      tags: p.tags,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      soldCount: p.soldCount,
      totalStock: p.totalStock,
      category: p.category,
      images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
      variants: p.variants.map((v) => ({
        id: v.id,
        name: v.name,
        options: v.options as Record<string, string>,
        price: v.price,
        compareAtPrice: validCompareAt(v.price, v.compareAtPrice),
        stock: v.stock,
        weightGram: v.weightGram,
      })),
      store: { ...p.store, activeProducts: p.store._count.products, _count: undefined },
      reviews: p.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        variantName: r.orderItem.variantName,
        // Nama disamarkan demi privasi, mis. "R***a"
        author: maskName(r.user.name),
      })),
      ratingBreakdown: Object.fromEntries([5, 4, 3, 2, 1].map((n) => [n, ratingBreakdown.find((b) => b.rating === n)?._count ?? 0])),
    };
  }

  /** Produk serupa: kategori sama + tag yang beririsan, diurutkan kemiripan. */
  async similar(id: string, take = 8) {
    const p = await this.prisma.client.product.findFirst({ where: { id, ...visibleProduct }, select: { categoryId: true, tags: true, minPrice: true } });
    if (!p) throw new NotFoundException('Produk tidak ditemukan');
    const rows = await this.prisma.client.product.findMany({
      where: { ...visibleProduct, id: { not: id }, OR: [{ categoryId: p.categoryId }, { tags: { hasSome: p.tags } }] },
      include: productCardInclude,
      take: 40,
    });
    return rows
      .map((r) => {
        const shared = r.tags.filter((t) => p.tags.includes(t)).length;
        const priceCloseness = 1 - Math.min(1, Math.abs(r.minPrice - p.minPrice) / Math.max(p.minPrice, 1));
        return { r, score: (r.categoryId === p.categoryId ? 3 : 0) + shared + priceCloseness };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, take)
      .map((x) => toProductCard(x.r));
  }

  async store(slug: string) {
    const s = await this.prisma.client.store.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: { id: true, name: true, slug: true, description: true, city: true, logoUrl: true, isUmkm: true, createdAt: true },
    });
    if (!s) throw new NotFoundException('Toko tidak ditemukan');
    const stats = await this.prisma.client.product.aggregate({ where: { storeId: s.id, status: 'ACTIVE' }, _count: true, _sum: { soldCount: true }, _avg: { ratingAvg: true } });
    return { ...s, productCount: stats._count, totalSold: stats._sum.soldCount ?? 0 };
  }

  async featuredStores(take = 6) {
    const stores = await this.prisma.client.store.findMany({
      where: { status: 'ACTIVE', isUmkm: true },
      select: {
        name: true, slug: true, city: true, logoUrl: true, description: true,
        products: { where: { status: 'ACTIVE' }, select: { soldCount: true }, take: 50 },
      },
      take: 30,
    });
    return stores
      .map(({ products, ...s }) => ({ ...s, productCount: products.length, totalSold: products.reduce((n, p) => n + p.soldCount, 0) }))
      .filter((s) => s.productCount > 0)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, take);
  }

  /** Bagian-bagian beranda */
  async home() {
    const [popular, newest, deals, categories, stores] = await Promise.all([
      this.search({ sort: 'popular', limit: 8 }),
      this.search({ sort: 'newest', limit: 8 }),
      this.prisma.client.product.findMany({
        where: { ...visibleProduct, variants: { some: { isActive: true, compareAtPrice: { not: null } } } },
        include: productCardInclude,
        take: 30,
      }),
      this.categories(),
      this.featuredStores(),
    ]);
    const dealCards = deals.map(toProductCard).filter((c) => c.discountPercent > 0).sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 10);
    return { categories, popular: popular.items, newest: newest.items, deals: dealCards, stores };
  }

  /**
   * Rekomendasi. Personal hanya jika ada cukup data (produk dilihat / dibeli);
   * jika tidak, terus terang memakai produk populer.
   */
  async recommendations(userId: string | undefined, take = 8) {
    if (userId) {
      const [views, purchases] = await Promise.all([
        this.prisma.client.productView.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30, select: { product: { select: { id: true, categoryId: true, tags: true, minPrice: true } } } }),
        this.prisma.client.orderItem.findMany({ where: { order: { buyerId: userId, status: { not: 'CANCELLED' } } }, take: 20, select: { productId: true } }),
      ]);
      const seen = new Set([...views.map((v) => v.product.id), ...purchases.map((p) => p.productId)]);
      if (views.length >= 3) {
        const catWeight = new Map<string, number>();
        const tagWeight = new Map<string, number>();
        const prices: number[] = [];
        views.forEach((v, i) => {
          const w = 1 / (1 + i * 0.15);
          catWeight.set(v.product.categoryId, (catWeight.get(v.product.categoryId) ?? 0) + w * 3);
          v.product.tags.forEach((t) => tagWeight.set(t, (tagWeight.get(t) ?? 0) + w));
          prices.push(v.product.minPrice);
        });
        const typicalPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
        const candidates = await this.prisma.client.product.findMany({
          where: { ...visibleProduct, id: { notIn: [...seen] }, OR: [{ categoryId: { in: [...catWeight.keys()] } }, { tags: { hasSome: [...tagWeight.keys()] } }] },
          include: productCardInclude,
          take: 60,
        });
        const items = candidates
          .map((c) => {
            let score = catWeight.get(c.categoryId) ?? 0;
            c.tags.forEach((t) => (score += tagWeight.get(t) ?? 0));
            score += 1 - Math.min(1, Math.abs(c.minPrice - typicalPrice) / Math.max(typicalPrice, 1)); // harga mirip kebiasaan
            return { c, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, take)
          .map((x) => toProductCard(x.c));
        if (items.length >= 4) return { personalized: true, reason: 'Berdasarkan produk yang baru kamu lihat', items };
      }
    }
    const popular = await this.search({ sort: 'popular', limit: take });
    return { personalized: false, reason: 'Produk populer di Shopia', items: popular.items };
  }

  async activeVouchers() {
    const now = new Date();
    const rows = await this.prisma.client.voucher.findMany({
      where: { isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      select: { code: true, description: true, type: true, value: true, minSpend: true, maxDiscount: true, endsAt: true, quota: true, usedCount: true },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
    return rows.filter((v) => v.quota === null || v.usedCount < v.quota).map(({ quota: _q, usedCount: _u, ...v }) => v);
  }

  async recordView(userId: string, productId: string) {
    const exists = await this.prisma.client.product.count({ where: { id: productId, ...visibleProduct } });
    if (!exists) throw new NotFoundException('Produk tidak ditemukan');
    // Hindari duplikasi: abaikan jika produk yang sama dilihat dalam 10 menit terakhir
    const recent = await this.prisma.client.productView.findFirst({ where: { userId, productId, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } } });
    if (!recent) await this.prisma.client.productView.create({ data: { userId, productId } });
    return { ok: true };
  }
}

function maskName(name: string | null) {
  if (!name) return 'Pembeli';
  const first = name.trim().split(/\s+/)[0];
  return first.length <= 2 ? first[0] + '*' : `${first[0]}${'*'.repeat(Math.min(3, first.length - 2))}${first[first.length - 1]}`;
}
