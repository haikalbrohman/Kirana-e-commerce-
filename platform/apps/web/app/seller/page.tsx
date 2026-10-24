import Link from "next/link";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { requireRole } from "@/lib/session";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { SalesChart, Stat } from "@/components/seller/charts";
import { AiInsight } from "@/components/seller/insight";
import { IconAlert, IconBag, IconCard, IconChart, IconPackage, IconPlus } from "@/components/icons";

export const metadata = { title: "Dasbor penjual" };

type Stats = {
  store: { name: string; status: string };
  series: { date: string; revenue: number; orders: number }[];
  totals: { grossSales: number; orders: number; itemsSold: number; avgOrderValue: number; shippingCollected: number; discounts: number; platformFeePercent: number; platformFee: number; netEstimate: number };
  statusCounts: Record<string, number>;
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
  lowStock: { id: string; name: string; stock: number; product: { id: string; name: string } }[];
  payouts: { pending: number; paidOut: number };
};

export default async function SellerHome() {
  await requireRole("SELLER", "/seller");
  const s = await api<Stats>("/seller/stats?days=30");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Halo 👋</p>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">{s.store.name}</h1>
          <p className="text-sm text-muted">Ringkasan 30 hari terakhir</p>
        </div>
        <ButtonLink href="/seller/products/new"><IconPlus size={18} /> Tambah produk</ButtonLink>
      </div>

      {s.store.status !== "ACTIVE" && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <IconAlert className="shrink-0" />
          <p>{s.store.status === "PENDING" ? "Toko sedang ditinjau admin. Produk yang kamu siapkan akan tampil setelah toko disetujui." : "Toko dinonaktifkan admin. Cek notifikasi untuk alasannya."}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        <Stat icon={<IconChart size={17} />} label="Penjualan kotor" value={rupiah(s.totals.grossSales)} hint="Harga produk, tanpa ongkir" />
        <Stat icon={<IconPackage size={17} />} label="Pesanan dibayar" value={String(s.totals.orders)} />
        <Stat icon={<IconBag size={17} />} label="Barang terjual" value={String(s.totals.itemsSold)} />
        <Stat icon={<IconCard size={17} />} label="Rata-rata pesanan" value={rupiah(s.totals.avgOrderValue)} />
      </div>

      <Card className="p-5">
        <p className="mb-3 font-bold">Laporan penjualan harian</p>
        <SalesChart series={s.series} />
      </Card>

      <AiInsight />

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Card className="p-5">
          <p className="mb-3 font-bold">Perlu tindakan</p>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><Link href="/seller/orders?status=PAID" className="hover:text-brand-700">Pesanan baru (perlu diproses)</Link><Badge tone={s.statusCounts.PAID ? "amber" : "gray"}>{s.statusCounts.PAID ?? 0}</Badge></li>
            <li className="flex justify-between"><Link href="/seller/orders?status=PROCESSING" className="hover:text-brand-700">Siap dikirim</Link><Badge tone={s.statusCounts.PROCESSING ? "blue" : "gray"}>{s.statusCounts.PROCESSING ?? 0}</Badge></li>
            <li className="flex justify-between"><span>Sedang dikirim</span><Badge>{s.statusCounts.SHIPPED ?? 0}</Badge></li>
          </ul>
          {s.lowStock.length > 0 && (
            <>
              <p className="mb-2 mt-5 text-sm font-bold text-rose-700">Stok hampir habis</p>
              <ul className="space-y-1.5 text-sm">
                {s.lowStock.map((v) => (
                  <li key={v.id} className="flex justify-between gap-2">
                    <Link href={`/seller/products/${v.product.id}`} className="truncate hover:text-brand-700">{v.product.name} · {v.name}</Link>
                    <span className="shrink-0 font-semibold text-rose-600">{v.stock}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card className="p-5">
          <p className="mb-3 font-bold">Produk terlaris</p>
          {s.topProducts.length === 0 ? <p className="text-sm text-muted">Belum ada penjualan dalam 30 hari terakhir.</p> : (
            <ol className="space-y-2 text-sm">
              {s.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3">
                  <span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-lime-300 text-ink" : "bg-brand-50 text-brand-700"}`}>{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="text-muted">{p.quantity}×</span>
                  <span className="font-semibold">{rupiah(p.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <p className="mb-3 font-bold">Laporan pendapatan (30 hari)</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between"><dt className="text-muted">Penjualan kotor</dt><dd>{rupiah(s.totals.grossSales)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Ongkir dibayar pembeli</dt><dd>{rupiah(s.totals.shippingCollected)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Diskon voucher (ditanggung Shopia)</dt><dd>{rupiah(s.totals.discounts)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Biaya platform ({s.totals.platformFeePercent}%)</dt><dd>−{rupiah(s.totals.platformFee)}</dd></div>
          <div className="flex justify-between font-bold sm:col-span-2"><dt>Perkiraan pendapatan bersih</dt><dd>{rupiah(s.totals.netEstimate)}</dd></div>
          <div className="flex justify-between text-muted"><dt>Menunggu pencairan</dt><dd>{rupiah(s.payouts.pending)}</dd></div>
          <div className="flex justify-between text-muted"><dt>Sudah dicairkan</dt><dd>{rupiah(s.payouts.paidOut)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">Dana dicairkan melalui mitra pembayaran berizin setelah pesanan selesai. Shopia tidak menyimpan dana.</p>
      </Card>
    </div>
  );
}
