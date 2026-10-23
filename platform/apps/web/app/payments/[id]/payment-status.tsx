"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { call, ClientApiError } from "@/lib/client";
import { dateID, ORDER_STATUS, PAYMENT_STATUS, rupiah } from "@/lib/format";
import { Badge, Button, ButtonLink, Card } from "@/components/ui";
import { IconCheck, IconClock, IconX } from "@/components/icons";
import { useToast } from "@/components/toast";

type Payment = { id: string; status: string; amount: number; redirectUrl: string | null; expiresAt: string; paidAt: string | null; paymentType: string | null; orders: { id: string; orderNumber: string; status: string }[] };

/** Status pembayaran diambil dari server (hasil webhook terverifikasi), diperbarui otomatis. */
export function PaymentStatus({ initial }: { initial: Payment }) {
  const [p, setP] = useState(initial);
  const [cancelling, setCancelling] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (p.status !== "PENDING") return;
    const t = setInterval(() => call<Payment>(`/payments/${p.id}`).then(setP).catch(() => null), 4000);
    return () => clearInterval(t);
  }, [p.id, p.status]);

  const s = PAYMENT_STATUS[p.status];
  const icon = p.status === "PAID" ? <IconCheck size={32} /> : p.status === "PENDING" ? <IconClock size={32} /> : <IconX size={32} />;
  return (
    <Card className="mx-auto max-w-lg p-6 text-center animate-slide-up">
      <div className={`mx-auto grid size-16 place-items-center rounded-full ${p.status === "PAID" ? "bg-brand-100 text-brand-700" : p.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{icon}</div>
      <h1 className="mt-4 text-xl font-extrabold">{p.status === "PAID" ? "Pembayaran berhasil" : p.status === "PENDING" ? "Menunggu pembayaran" : s?.label}</h1>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{rupiah(p.amount)}</p>
      {p.status === "PENDING" && <p className="mt-2 text-sm text-muted">Selesaikan sebelum {dateID(p.expiresAt, true)}. Halaman ini diperbarui otomatis setelah pembayaran dikonfirmasi.</p>}
      {p.status === "PAID" && <p className="mt-2 text-sm text-muted">Dikonfirmasi {p.paidAt ? dateID(p.paidAt, true) : ""}{p.paymentType ? ` via ${p.paymentType.toUpperCase()}` : ""}. Penjual sudah diberi tahu.</p>}

      <ul className="mt-5 space-y-2 text-left">
        {p.orders.map((o) => (
          <li key={o.id}>
            <Link href={`/orders/${o.id}`} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm hover:border-brand-200">
              <span className="font-mono text-xs">{o.orderNumber}</span>
              <Badge tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label}</Badge>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
        {p.status === "PENDING" && p.redirectUrl && <ButtonLink href={p.redirectUrl} size="lg" block>Lanjutkan pembayaran</ButtonLink>}
        {p.status === "PENDING" && (
          <Button
            variant="ghost"
            disabled={cancelling}
            onClick={async () => {
              if (!confirm("Batalkan pesanan ini? Stok akan dikembalikan.")) return;
              setCancelling(true);
              try {
                setP(await call<Payment>(`/payments/${p.id}/cancel`, { method: "POST" }));
              } catch (e) {
                toast({ tone: "error", title: e instanceof ClientApiError ? e.message : "Gagal membatalkan" });
              } finally {
                setCancelling(false);
              }
            }}
          >
            Batalkan pesanan
          </Button>
        )}
        {p.status !== "PENDING" && <ButtonLink href="/orders" variant={p.status === "PAID" ? "primary" : "outline"} block>Lihat pesanan saya</ButtonLink>}
      </div>
    </Card>
  );
}
