import { validCompareAt } from '../common/util.js';

/** Data yang dibutuhkan untuk kartu produk */
export const productCardInclude = {
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1 },
  variants: { where: { isActive: true }, orderBy: { price: 'asc' as const }, select: { price: true, compareAtPrice: true, stock: true } },
  store: { select: { name: true, slug: true, city: true, isUmkm: true } },
  category: { select: { name: true, slug: true, icon: true } },
};

type CardSource = {
  id: string;
  name: string;
  slug: string;
  minPrice: number;
  totalStock: number;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  createdAt: Date;
  tags: string[];
  images: { url: string; alt: string | null }[];
  variants: { price: number; compareAtPrice: number | null; stock: number }[];
  store: { name: string; slug: string; city: string | null; isUmkm: boolean };
  category: { name: string; slug: string; icon: string | null };
};

export function toProductCard(p: CardSource) {
  const cheapest = p.variants[0];
  const price = cheapest?.price ?? p.minPrice;
  const compareAtPrice = cheapest ? validCompareAt(cheapest.price, cheapest.compareAtPrice) : null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price,
    compareAtPrice,
    discountPercent: compareAtPrice ? Math.round((1 - price / compareAtPrice) * 100) : 0,
    hasMultiplePrices: new Set(p.variants.map((v) => v.price)).size > 1,
    imageUrl: p.images[0]?.url ?? null,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    soldCount: p.soldCount,
    inStock: p.totalStock > 0,
    isNew: Date.now() - p.createdAt.getTime() < 14 * 864e5,
    store: p.store,
    category: p.category,
  };
}

export type ProductCard = ReturnType<typeof toProductCard>;
