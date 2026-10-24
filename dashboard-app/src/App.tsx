import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Boxes, ChartColumn, Info, LayoutDashboard, Package, ReceiptText, Search, ShoppingBag, TriangleAlert, Wallet } from "lucide-react";
import { BarChart, StatCard, StatusPill } from "@/components/dashboard";
import { cn } from "@/lib/utils";
import { last7Days, loadCategories, loadOrders, loadProducts, rupiah, sampleOrders, shortRupiah, stockStatus, weekDelta, type Order, type Product } from "@/data";

type Tab = "ringkasan" | "pesanan" | "produk";
const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: "ringkasan", label: "Ringkasan", icon: LayoutDashboard },
  { id: "pesanan", label: "Pesanan", icon: ReceiptText },
  { id: "produk", label: "Produk", icon: Boxes },
];
const ORDER_FILTERS = ["Semua", "Menunggu", "Diproses", "Dikirim", "Selesai", "Dibatalkan"];

const readTab = (): Tab => {
  const h = location.hash.slice(1) as Tab;
  return TABS.some((t) => t.id === h) ? h : "ringkasan";
};
const dateID = (d: string) => new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function App() {
  const [tab, setTab] = useState<Tab>(readTab);
  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const products = useMemo(loadProducts, []);
  const categories = useMemo(loadCategories, []);
  const realOrders = useMemo(loadOrders, []);
  const isSample = realOrders.length === 0;
  const orders = useMemo(() => (isSample ? sampleOrders(products) : realOrders), [isSample, products, realOrders]);

  return (
    <div className="min-h-dvh pb-10">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <a href="../#/" className="grid size-10 place-items-center rounded-full bg-card shadow-soft" aria-label="Kembali ke toko">
            <ArrowLeft className="size-5" />
          </a>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Shopia</p>
            <h1 className="truncate text-lg font-bold leading-tight">Dasbor Toko</h1>
          </div>
          <a href="../#/admin" className="rounded-full bg-lime px-4 py-2.5 text-sm font-bold shadow-[0_8px_22px_rgb(188_211_37/0.45)] hover:brightness-95">
            Kelola produk
          </a>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3" aria-label="Bagian dasbor">
          {TABS.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={tab === id ? "page" : undefined}
              className={cn("flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition", tab === id ? "bg-foreground text-white" : "bg-card text-muted-foreground shadow-soft hover:text-foreground")}
            >
              <Icon className="size-4" /> {label}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5">
        {isSample && tab !== "produk" && (
          <p className="mb-4 flex items-start gap-2 rounded-2xl border bg-card p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Belum ada pesanan di perangkat ini, jadi angka pesanan & grafik memakai <b className="text-foreground">data contoh</b>. Data produk & stok sudah asli dari toko.</span>
          </p>
        )}
        {tab === "ringkasan" && <Overview products={products} orders={orders} />}
        {tab === "pesanan" && <Orders orders={orders} />}
        {tab === "produk" && <Products products={products} categoryName={(id) => categories.find((c) => c.id === id)?.name ?? id} />}
      </main>
    </div>
  );
}

function Overview({ products, orders }: { products: Product[]; orders: Order[] }) {
  const series = last7Days(orders);
  const weekRevenue = series.reduce((n, d) => n + d.value, 0);
  const weekOrders = orders.filter((o) => +new Date(o.date) > Date.now() - 7 * 864e5).length;
  const active = products.filter((p) => p.stock > 0).length;
  const low = products.filter((p) => p.stock <= 5).length;
  const top = [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        <StatCard icon={Wallet} label="Pendapatan 7 hari" value={shortRupiah(weekRevenue)} delta={weekDelta(orders)} />
        <StatCard icon={ShoppingBag} label="Pesanan 7 hari" value={String(weekOrders)} />
        <StatCard icon={Package} label="Produk aktif" value={`${active}/${products.length}`} />
        <StatCard icon={TriangleAlert} label="Stok menipis (≤5)" value={String(low)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-bold"><ChartColumn className="size-4 text-primary" /> Penjualan 7 hari terakhir</h2>
              <p className="mt-1 text-2xl font-bold">{rupiah(weekRevenue)}</p>
            </div>
            <span className="text-xs text-muted-foreground">Tanpa pesanan batal</span>
          </div>
          <BarChart data={series} />
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="mb-3 font-bold">Produk terlaris</h2>
          <ol className="space-y-3">
            {top.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold", i === 0 ? "bg-lime" : "bg-primary-soft text-primary")}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="shrink-0 text-muted-foreground">{p.sold.toLocaleString("id-ID")} terjual</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-soft">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">Pesanan terbaru</h2>
          <a href="#pesanan" className="text-sm font-semibold text-primary">Lihat semua</a>
        </div>
        <OrderList orders={orders.slice(0, 5)} />
      </section>
    </div>
  );
}

function OrderList({ orders }: { orders: Order[] }) {
  if (!orders.length) return <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada pesanan dengan status ini.</p>;
  return (
    <ul className="divide-y">
      {orders.map((o) => (
        <li key={o.id} className="flex items-center gap-3 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><ShoppingBag className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{o.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ") || "Pesanan"}</p>
            <p className="truncate text-xs text-muted-foreground">{o.id} · {dateID(o.date)}{o.city ? ` · ${o.city}` : ""}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold">{rupiah(o.total)}</p>
            <StatusPill s={o.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Orders({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState("Semua");
  const list = filter === "Semua" ? orders : orders.filter((o) => o.status === filter);
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
      <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {ORDER_FILTERS.map((f) => {
          const n = f === "Semua" ? orders.length : orders.filter((o) => o.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition", filter === f ? "border-foreground bg-foreground text-white" : "bg-card text-muted-foreground hover:text-foreground")}>
              {f} <span className="opacity-60">{n}</span>
            </button>
          );
        })}
      </div>
      <OrderList orders={list} />
    </section>
  );
}

function Products({ products, categoryName }: { products: Product[]; categoryName: (id: string) => string }) {
  const [q, setQ] = useState("");
  const list = products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
      <label className="mb-3 flex h-11 items-center gap-2 rounded-full border bg-background px-4 focus-within:border-primary">
        <Search className="size-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk…" aria-label="Cari produk" className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
      </label>
      {!products.length && <p className="py-8 text-center text-sm text-muted-foreground">Data produk toko belum bisa dimuat.</p>}
      <ul className="divide-y">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl text-2xl" style={{ background: p.color ?? "var(--color-primary-soft)" }}>
              {p.images?.length ? <img src={`../${p.images[0]}`} alt="" className="size-full object-cover" loading="lazy" /> : p.emoji ?? "🛍️"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">{categoryName(p.category)} · {rupiah(p.price)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold">{p.stock} <span className="text-xs font-normal text-muted-foreground">stok</span></p>
              <StatusPill s={stockStatus(p.stock)} />
            </div>
          </li>
        ))}
      </ul>
      {products.length > 0 && !list.length && <p className="py-8 text-center text-sm text-muted-foreground">Produk tidak ditemukan.</p>}
    </section>
  );
}
