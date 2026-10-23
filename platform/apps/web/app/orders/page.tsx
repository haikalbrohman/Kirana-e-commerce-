import Link from "next/link";
import { api } from "@/lib/api";
import { dateID, ORDER_STATUS, rupiah } from "@/lib/format";
import { requireMe } from "@/lib/session";
import { Badge, ButtonLink, Card, cx, EmptyState, ProductImage } from "@/components/ui";
import { IconPackage } from "@/components/icons";

export const metadata = { title: "Pesanan saya" };

type OrderRow = { id: string; orderNumber: string; status: string; total: number; createdAt: string; store: { name: string }; items: { productName: string; variantName: string; imageUrl: string | null; quantity: number }[]; _count: { items: number }; payment: { id: string; status: string } };

const TABS = [["", "Semua"], ["PENDING_PAYMENT", "Belum bayar"], ["PAID", "Dibayar"], ["SHIPPED", "Dikirim"], ["COMPLETED", "Selesai"], ["CANCELLED", "Batal"]];

export default async function OrdersPage(props: PageProps<"/orders">) {
  await requireMe("/orders");
  const { status = "" } = (await props.searchParams) as { status?: string };
  const data = await api<{ items: OrderRow[]; total: number }>(`/orders${status ? `?status=${status}` : ""}`);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Pesanan saya</h1>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
        {TABS.map(([v, l]) => (
          <Link key={v} href={v ? `/orders?status=${v}` : "/orders"} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", status === v ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white")}>
            {l}
          </Link>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {data.items.length === 0 ? (
          <EmptyState icon={<IconPackage size={28} />} title="Belum ada pesanan" text="Pesanan yang kamu buat akan muncul di sini." action={<ButtonLink href="/">Mulai belanja</ButtonLink>} />
        ) : (
          data.items.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="block">
              <Card className="p-4 transition hover:border-brand-200">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-bold">{o.store.name}</span>
                  <Badge tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-14 shrink-0 overflow-hidden rounded-lg"><ProductImage src={o.items[0]?.imageUrl ?? null} alt={o.items[0]?.productName ?? ""} /></div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate">{o.items[0]?.productName}</p>
                    <p className="text-xs text-muted">{o.items[0]?.variantName} · {o.items[0]?.quantity} barang{o._count.items > 1 ? ` · +${o._count.items - 1} produk lain` : ""}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
                  <span className="text-xs text-muted">{dateID(o.createdAt)} · <span className="font-mono">{o.orderNumber}</span></span>
                  <span className="font-extrabold">{rupiah(o.total)}</span>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
