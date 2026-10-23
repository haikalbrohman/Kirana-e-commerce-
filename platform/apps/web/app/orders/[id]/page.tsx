import Link from "next/link";
import { notFound } from "next/navigation";
import { apiOrNull } from "@/lib/api";
import { dateID, ORDER_STATUS, PAYMENT_STATUS, rupiah } from "@/lib/format";
import { requireMe } from "@/lib/session";
import { Badge, ButtonLink, Card, cx, ProductImage } from "@/components/ui";
import { IconCheck, IconTruck } from "@/components/icons";
import { CompleteOrderButton, ReviewForm } from "./order-actions";

type Order = {
  id: string; orderNumber: string; status: string; createdAt: string; subtotal: number; shippingCost: number; discount: number; total: number; voucherCode: string | null; note: string | null; cancelReason: string | null;
  addressSnapshot: { recipientName: string; phone: string; line1: string; city: string; province: string; postalCode: string };
  store: { name: string; slug: string };
  items: { id: string; productId: string; productName: string; variantName: string; imageUrl: string | null; unitPrice: number; quantity: number; lineTotal: number; review: { rating: number } | null }[];
  shipment: { courier: string; service: string; etaText: string | null; trackingNumber: string | null; status: string } | null;
  events: { id: string; status: string; note: string | null; createdAt: string }[];
  payment: { id: string; status: string; paymentType: string | null; redirectUrl: string | null };
};

const FLOW = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"];

export default async function OrderPage(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  await requireMe(`/orders/${id}`);
  const o = await apiOrNull<Order>(`/orders/${id}`);
  if (!o) notFound();
  const stepIndex = FLOW.indexOf(o.status);
  const a = o.addressSnapshot;
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold">Detail pesanan</h1>
          <p className="font-mono text-xs text-muted">{o.orderNumber} · {dateID(o.createdAt, true)}</p>
        </div>
        <Badge tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label}</Badge>
      </div>

      {/* Linimasa status */}
      {o.status !== "CANCELLED" ? (
        <Card className="p-5">
          <ol className="grid grid-cols-6 gap-1 text-center text-[10px] font-medium sm:text-xs">
            {FLOW.map((s, i) => (
              <li key={s} className="flex flex-col items-center gap-1.5">
                <span className={cx("grid size-7 place-items-center rounded-full", i <= stepIndex ? "bg-brand-600 text-white" : "bg-slate-100 text-muted")}>
                  {i <= stepIndex ? <IconCheck size={14} /> : i + 1}
                </span>
                <span className={i <= stepIndex ? "text-brand-800" : "text-muted"}>{ORDER_STATUS[s].label}</span>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <Card className="border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">Pesanan dibatalkan: {o.cancelReason ?? "-"}</Card>
      )}

      {o.status === "PENDING_PAYMENT" && <ButtonLink href={`/payments/${o.payment.id}`} block size="lg">Lanjutkan pembayaran</ButtonLink>}
      {(o.status === "SHIPPED" || o.status === "DELIVERED") && <CompleteOrderButton orderId={o.id} />}

      {o.shipment && (
        <Card className="p-5">
          <p className="mb-2 flex items-center gap-2 font-bold"><IconTruck size={18} className="text-brand-600" /> Pengiriman</p>
          <p className="text-sm">{o.shipment.courier} {o.shipment.service}{o.shipment.etaText ? ` · estimasi ${o.shipment.etaText}` : ""}</p>
          {o.shipment.trackingNumber && <p className="mt-1 text-sm">No. resi: <span className="font-mono font-semibold">{o.shipment.trackingNumber}</span> <span className="text-xs text-muted">(lacak di situs kurir)</span></p>}
          <div className="mt-3 rounded-xl bg-canvas p-3 text-sm">
            <p className="font-semibold">{a.recipientName} · {a.phone}</p>
            <p className="text-muted">{a.line1}, {a.city}, {a.province} {a.postalCode}</p>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <Link href={`/store/${o.store.slug}`} className="mb-3 block font-bold hover:text-brand-700">{o.store.name}</Link>
        <ul className="divide-y divide-line">
          {o.items.map((it) => (
            <li key={it.id} className="py-3">
              <div className="flex gap-3">
                <Link href={`/p/${it.productId}`} className="w-16 shrink-0 overflow-hidden rounded-lg"><ProductImage src={it.imageUrl} alt={it.productName} /></Link>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">{it.productName}</p>
                  <p className="text-xs text-muted">{it.variantName} · {it.quantity} × {rupiah(it.unitPrice)}</p>
                  {it.review && <p className="mt-1 text-xs text-brand-700">✓ Kamu memberi {it.review.rating} bintang</p>}
                </div>
                <p className="text-sm font-semibold">{rupiah(it.lineTotal)}</p>
              </div>
              {!it.review && ["DELIVERED", "COMPLETED"].includes(o.status) && <ReviewForm orderItemId={it.id} />}
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{rupiah(o.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Ongkir</dt><dd>{rupiah(o.shippingCost)}</dd></div>
          {o.discount > 0 && <div className="flex justify-between text-brand-700"><dt>Diskon {o.voucherCode}</dt><dd>−{rupiah(o.discount)}</dd></div>}
          <div className="flex justify-between pt-1 text-base font-extrabold"><dt>Total</dt><dd>{rupiah(o.total)}</dd></div>
          <div className="flex justify-between text-xs text-muted"><dt>Pembayaran</dt><dd>{PAYMENT_STATUS[o.payment.status]?.label}{o.payment.paymentType ? ` · ${o.payment.paymentType.toUpperCase()}` : ""}</dd></div>
        </dl>
        {o.note && <p className="mt-3 rounded-xl bg-canvas p-3 text-xs text-muted">Catatan: {o.note}</p>}
      </Card>

      <Card className="p-5">
        <p className="mb-3 font-bold">Riwayat</p>
        <ol className="space-y-3 border-l-2 border-brand-100 pl-4">
          {[...o.events].reverse().map((e) => (
            <li key={e.id} className="relative text-sm">
              <span className="absolute -left-[23px] top-1 size-3 rounded-full bg-brand-500 ring-4 ring-white" />
              <p className="font-semibold">{ORDER_STATUS[e.status]?.label}</p>
              {e.note && <p className="text-muted">{e.note}</p>}
              <p className="text-xs text-muted">{dateID(e.createdAt, true)}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
