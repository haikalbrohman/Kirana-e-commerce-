/**
 * Sumber data dasbor:
 * - Produk & kategori: data asli situs Shopia (../js/products.js & ../js/data.js)
 * - Pesanan: riwayat checkout yang tersimpan di perangkat ini (localStorage "shopia_v1").
 *   Jika belum ada, dipakai data contoh yang ditandai jelas di layar.
 */
export type Product = { id: string; name: string; category: string; price: number; stock: number; sold: number; emoji?: string; color?: string; images?: string[] };
export type Category = { id: string; name: string; icon: string };
export type Order = { id: string; date: string; status: string; total: number; items: { name: string; qty: number }[]; city?: string };

declare const PRODUCTS: Product[];
declare const CATEGORIES: Category[];

export function loadProducts(): Product[] {
  return typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) ? PRODUCTS : [];
}

export function loadCategories(): Category[] {
  return typeof CATEGORIES !== "undefined" && Array.isArray(CATEGORIES) ? CATEGORIES : [];
}

export function loadOrders(): Order[] {
  try {
    const state = JSON.parse(localStorage.getItem("shopia_v1") ?? "null");
    const list = Array.isArray(state?.orders) ? state.orders : [];
    return list.map((o: Record<string, unknown>) => ({
      id: String(o.id),
      date: String(o.date),
      status: String(o.status ?? "Diproses"),
      total: Number(o.total) || 0,
      items: Array.isArray(o.items) ? (o.items as { name: string; qty: number }[]) : [],
      city: (o.address as { city?: string } | undefined)?.city,
    }));
  } catch {
    return [];
  }
}

/** Data contoh (tetap sama setiap dibuka) memakai nama produk asli. */
export function sampleOrders(products: Product[]): Order[] {
  const statuses = ["Selesai", "Dikirim", "Diproses", "Selesai", "Menunggu", "Selesai", "Dikirim", "Dibatalkan", "Selesai", "Diproses", "Selesai", "Dikirim", "Selesai", "Selesai"];
  const cities = ["Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Medan", "Makassar", "Semarang"];
  const now = new Date();
  return statuses.map((status, i) => {
    const p = products[(i * 5) % Math.max(1, products.length)];
    const qty = (i % 3) + 1;
    const d = new Date(now);
    d.setDate(now.getDate() - Math.floor(i * 0.9));
    d.setHours(9 + ((i * 3) % 11), (i * 17) % 60);
    return {
      id: `CONTOH-${String(1040 - i)}`,
      date: d.toISOString(),
      status,
      total: (p?.price ?? 100000) * qty + 15000,
      items: [{ name: p?.name ?? "Produk contoh", qty }],
      city: cities[i % cities.length],
    };
  });
}

export const rupiah = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
export const shortRupiah = (n: number) =>
  n >= 1_000_000 ? `Rp${(n / 1_000_000).toFixed(1).replace(".0", "").replace(".", ",")}jt` : n >= 1000 ? `Rp${Math.round(n / 1000)}rb` : rupiah(n);

const DAY = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const counts = (o: Order) => o.status !== "Dibatalkan";

/** Pendapatan per hari, 7 hari terakhir (hari ini paling kanan). */
export function last7Days(orders: Order[]) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, k) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - k));
    const value = orders.filter((o) => counts(o) && sameDay(new Date(o.date), d)).reduce((n, o) => n + o.total, 0);
    return { label: k === 6 ? "Hari ini" : DAY[d.getDay()], value };
  });
}

/** Perubahan pendapatan 7 hari ini dibanding 7 hari sebelumnya, mis. "+12%". */
export function weekDelta(orders: Order[]): string | undefined {
  const now = Date.now();
  const sum = (from: number, to: number) => orders.filter((o) => counts(o) && +new Date(o.date) > now - from && +new Date(o.date) <= now - to).reduce((n, o) => n + o.total, 0);
  const cur = sum(7 * 864e5, 0);
  const prev = sum(14 * 864e5, 7 * 864e5);
  if (!prev) return undefined;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

export const stockStatus = (stock: number) => (stock <= 0 ? "Habis" : stock <= 5 ? "Menipis" : "Aktif");
