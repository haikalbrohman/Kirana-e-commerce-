import Link from "next/link";
import { api } from "@/lib/api";
import { dateID, ORDER_STATUS, rupiah } from "@/lib/format";
import { requireRole } from "@/lib/session";
import { Badge, Card, cx, EmptyState } from "@/components/ui";
import { SellerOrderActions } from "@/components/seller/order-actions";
import { IconPackage } from "@/components/icons";

export const metadata = { title: "Pesanan masuk" };

type Row = { id: string; orderNumber: string; status: string; createdAt: string; subtotal: number; note: string | null; buyer: { name: string | null }; addressSnapshot: { recipientName: string; phone: string; line1: string; city: string; province: string; postalCode: string }; items: { id: string; productName: string; variantName: string; quantity: number; unitPrice: number }[]; shipment: { courier: string; service: string; trackingNumber: string | null } | null };
const TABS = [["", "Semua"], ["PAID", "Perlu diproses"], ["PROCESSING", "Siap kirim"], ["SHIPPED", "Dikirim"], ["COMPLETED", "Selesai"], ["CANCELLED", "Batal"]];

export default async function SellerOrders(props: PageProps<"/seller/orders">) {
  await requireRole("SELLER", "/seller/orders");
  const { status = "" } = (await props.searchParams) as { status?: string };
  const rows = await api<Row[]>(`/seller/orders${status ? `?status=${status}` : ""}`);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Pesanan masuk</h1>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
        {TABS.map(([v, l]) => <Link key={v} href={v ? `/seller/orders?status=${v}` : "/seller/orders"} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", status === v ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white")}>{l}</Link>)}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<IconPackage size={28} />} title="Belum ada pesanan" text="Pesanan yang sudah dibayar pembeli akan muncul di sini." />
      ) : (
        <div className="space-y-3">
          {rows.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs text-muted">{o.orderNumber} · {dateID(o.createdAt, true)}</p>
                <Badge tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label}</Badge>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {o.items.map((it) => <li key={it.id} className="flex justify-between gap-3"><span>{it.quantity}× {it.productName} <span className="text-muted">({it.variantName})</span></span><span>{rupiah(it.unitPrice * it.quantity)}</span></li>)}
              </ul>
              <div className="mt-3 grid gap-3 rounded-xl bg-canvas p-3 text-xs sm:grid-cols-2">
                <div>
                  <p className="font-semibold">Kirim ke: {o.addressSnapshot.recipientName} · {o.addressSnapshot.phone}</p>
                  <p className="text-muted">{o.addressSnapshot.line1}, {o.addressSnapshot.city}, {o.addressSnapshot.province} {o.addressSnapshot.postalCode}</p>
                </div>
                <div>
                  <p className="font-semibold">Kurir: {o.shipment?.courier} {o.shipment?.service}</p>
                  {o.shipment?.trackingNumber && <p className="text-muted">Resi: <span className="font-mono">{o.shipment.trackingNumber}</span></p>}
                  {o.note && <p className="text-muted">Catatan: {o.note}</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold">Subtotal {rupiah(o.subtotal)}</p>
                <SellerOrderActions id={o.id} status={o.status} courier={o.shipment?.courier ?? ""} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
