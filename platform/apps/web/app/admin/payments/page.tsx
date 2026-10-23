import { api } from "@/lib/api";
import { dateID, PAYMENT_STATUS, rupiah } from "@/lib/format";
import { StatusTabs } from "@/components/admin-tabs";
import { Badge, Card } from "@/components/ui";

export const metadata = { title: "Admin · Pembayaran" };
type Row = { id: string; providerOrderId: string; provider: string; amount: number; status: string; providerStatus: string | null; paymentType: string | null; createdAt: string; paidAt: string | null; user: { email: string }; _count: { orders: number; events: number } };

export default async function AdminPayments(props: PageProps<"/admin/payments">) {
  const { status = "" } = (await props.searchParams) as { status?: string };
  const rows = await api<Row[]>(`/admin/payments${status ? `?status=${status}` : ""}`);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Pembayaran</h1>
      <StatusTabs base="/admin/payments" current={status} tabs={[["", "Semua"], ["PENDING", "Tertunda"], ["PAID", "Lunas"], ["FAILED", "Gagal"], ["EXPIRED", "Kedaluwarsa"], ["REFUNDED", "Refund"]]} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="p-3">Order ID penyedia</th><th className="p-3">Pembeli</th><th className="p-3">Jumlah</th><th className="p-3">Status</th><th className="p-3">Webhook</th><th className="p-3">Waktu</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-mono text-xs">{p.providerOrderId}<br /><span className="text-muted">{p.provider} · {p._count.orders} pesanan</span></td>
                <td className="p-3 text-xs">{p.user.email}</td>
                <td className="p-3 font-semibold">{rupiah(p.amount)}</td>
                <td className="p-3"><Badge tone={PAYMENT_STATUS[p.status]?.tone}>{PAYMENT_STATUS[p.status]?.label}</Badge><br /><span className="text-xs text-muted">{p.providerStatus ?? "-"}{p.paymentType ? ` · ${p.paymentType}` : ""}</span></td>
                <td className="p-3 text-xs">{p._count.events} event</td>
                <td className="p-3 text-xs">{dateID(p.createdAt, true)}{p.paidAt && <><br />lunas {dateID(p.paidAt, true)}</>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
