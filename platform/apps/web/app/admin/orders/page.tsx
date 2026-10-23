import { api } from "@/lib/api";
import { dateID, ORDER_STATUS, rupiah } from "@/lib/format";
import { AdminAction } from "@/components/admin-action";
import { StatusTabs } from "@/components/admin-tabs";
import { Badge, Card } from "@/components/ui";

export const metadata = { title: "Admin · Pesanan" };
type Row = { id: string; orderNumber: string; status: string; payoutStatus: string; total: number; createdAt: string; store: { name: string }; buyer: { email: string }; payment: { status: string; provider: string } };

export default async function AdminOrders(props: PageProps<"/admin/orders">) {
  const { status = "" } = (await props.searchParams) as { status?: string };
  const rows = await api<Row[]>(`/admin/orders${status ? `?status=${status}` : ""}`);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Pesanan</h1>
      <StatusTabs base="/admin/orders" current={status} tabs={[["", "Semua"], ["PENDING_PAYMENT", "Belum bayar"], ["PAID", "Dibayar"], ["SHIPPED", "Dikirim"], ["COMPLETED", "Selesai"], ["CANCELLED", "Batal"]]} />
      <Card className="divide-y divide-line">
        {rows.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs">{o.orderNumber}</p>
              <p className="text-xs text-muted">{o.store.name} · {o.buyer.email} · {dateID(o.createdAt, true)}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label}</Badge>
                <Badge>Bayar: {o.payment.status} ({o.payment.provider})</Badge>
                {o.payoutStatus !== "NOT_ELIGIBLE" && <Badge tone={o.payoutStatus === "PAID_OUT" ? "brand" : "amber"}>Pencairan: {o.payoutStatus === "PAID_OUT" ? "selesai" : "tertunda"}</Badge>}
              </div>
            </div>
            <p className="font-bold">{rupiah(o.total)}</p>
            <div className="flex gap-2">
              {["PAID", "PROCESSING"].includes(o.status) && <AdminAction path={`/admin/orders/${o.id}/cancel`} label="Batalkan" variant="danger" needsReason />}
              {o.status === "COMPLETED" && o.payoutStatus === "PENDING" && <AdminAction path={`/admin/orders/${o.id}/payout`} label="Tandai dicairkan" confirmText="Pastikan dana sudah dicairkan ke penjual melalui dasbor mitra pembayaran." />}
            </div>
          </div>
        ))}
      </Card>
      <p className="mt-3 text-xs text-muted">Membatalkan pesanan yang sudah dibayar mengembalikan stok dan mencatat “refund diperlukan” di audit log. Lakukan refund di dasbor Midtrans.</p>
    </div>
  );
}
