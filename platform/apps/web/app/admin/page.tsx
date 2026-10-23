import Link from "next/link";
import { api } from "@/lib/api";
import { ORDER_STATUS, rupiah } from "@/lib/format";

const PRODUCT_STATUS: Record<string, string> = { ACTIVE: "Tampil", DRAFT: "Draf", REJECTED: "Diturunkan", ARCHIVED: "Diarsipkan" };
import { Card } from "@/components/ui";
import { Stat } from "@/components/seller/charts";
import { IconAlert } from "@/components/icons";

export const metadata = { title: "Admin" };
type Stats = { users: number; sellers: number; stores: Record<string, number>; products: Record<string, number>; orders: Record<string, number>; gmv30d: number; paidPayments30d: number; pendingPayments: number; ai24h: { requests: number; tokens: number }; attentionNeeded30d: number };

export default async function AdminHome() {
  const s = await api<Stats>("/admin/stats");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Ringkasan marketplace</h1>
      {s.attentionNeeded30d > 0 && (
        <Link href="/admin/audit?action=order.refund_required" className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <IconAlert className="shrink-0" /> {s.attentionNeeded30d} kejadian pembayaran perlu ditinjau (refund / nominal tidak cocok). Lihat audit log →
        </Link>
      )}
      {(s.stores.PENDING ?? 0) > 0 && <Link href="/admin/stores?status=PENDING" className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{s.stores.PENDING} toko menunggu persetujuan →</Link>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        <Stat label="Transaksi lunas (30 hari)" value={rupiah(s.gmv30d)} hint={`${s.paidPayments30d} pembayaran`} />
        <Stat label="Pengguna" value={String(s.users)} hint={`${s.sellers} penjual`} />
        <Stat label="Toko aktif" value={String(s.stores.ACTIVE ?? 0)} hint={`${s.stores.PENDING ?? 0} menunggu · ${s.stores.SUSPENDED ?? 0} nonaktif`} />
        <Stat label="Pembayaran tertunda" value={String(s.pendingPayments)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="p-5">
          <p className="mb-2 font-bold">Pesanan per status</p>
          <ul className="space-y-1 text-sm">{Object.entries(s.orders).map(([k, v]) => <li key={k} className="flex justify-between"><span className="text-muted">{ORDER_STATUS[k]?.label ?? k}</span><span className="font-semibold">{v}</span></li>)}</ul>
        </Card>
        <Card className="p-5">
          <p className="mb-2 font-bold">Produk per status</p>
          <ul className="space-y-1 text-sm">{Object.entries(s.products).map(([k, v]) => <li key={k} className="flex justify-between"><span className="text-muted">{PRODUCT_STATUS[k] ?? k}</span><span className="font-semibold">{v}</span></li>)}</ul>
        </Card>
        <Card className="p-5">
          <p className="mb-2 font-bold">Penggunaan model AI (24 jam)</p>
          <p className="text-sm">{s.ai24h.requests} permintaan · {s.ai24h.tokens.toLocaleString("id-ID")} token</p>
          <p className="mt-2 text-xs text-muted">Batas biaya harian diatur lewat AI_MAX_TOKENS_PER_DAY di API.</p>
        </Card>
      </div>
    </div>
  );
}
