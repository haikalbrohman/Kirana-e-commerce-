import { randomBytes } from 'node:crypto';

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'produk';

/** Nomor pesanan yang mudah dibaca, mis. SHP-20261023-7KQ2M9 */
export function orderNumber(date = new Date()) {
  const d = date.toISOString().slice(0, 10).replace(/-/g, '');
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const rand = [...randomBytes(6)].map((b) => alphabet[b % alphabet.length]).join('');
  return `SHP-${d}-${rand}`;
}

export function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** Diskon hanya ditampilkan jika harga coret benar-benar lebih tinggi dari harga jual. */
export const validCompareAt = (price: number, compareAt: number | null | undefined) =>
  compareAt && compareAt > price ? compareAt : null;
