"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { call, ClientApiError } from "@/lib/client";
import { rupiah } from "@/lib/format";
import type { Cart } from "@/lib/types";
import { useToast } from "@/components/toast";
import { Badge, ButtonLink, Card, cx, EmptyState, ProductImage } from "@/components/ui";
import { IconCart, IconMinus, IconPlus, IconStore, IconTrash } from "@/components/icons";

export function CartView({ initial }: { initial: Cart }) {
  const [cart, setCart] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function mutate(id: string, fn: () => Promise<Cart>) {
    setBusy(id);
    try {
      setCart(await fn());
      router.refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof ClientApiError ? e.message : "Gagal memperbarui keranjang" });
    } finally {
      setBusy(null);
    }
  }

  if (!cart.groups.length)
    return <EmptyState icon={<IconCart size={28} />} title="Keranjangmu masih kosong" text="Temukan produk favoritmu atau minta rekomendasi Shopia AI." action={<ButtonLink href="/">Mulai belanja</ButtonLink>} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-4">
        {cart.groups.map((g) => (
          <Card key={g.store.id} className="overflow-hidden">
            <Link href={`/store/${g.store.slug}`} className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-bold hover:text-brand-700">
              <IconStore size={16} className="text-brand-600" /> {g.store.name} <span className="font-normal text-muted">· {g.store.city}</span>
            </Link>
            <ul className="divide-y divide-line">
              {g.items.map((it) => (
                <li key={it.id} className={cx("flex gap-3 p-4 transition", busy === it.id && "opacity-50")}>
                  <Link href={`/p/${it.productId}`} className="w-20 shrink-0 overflow-hidden rounded-xl sm:w-24">
                    <ProductImage src={it.imageUrl} alt={it.productName} />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/p/${it.productId}`} className="line-clamp-2 text-sm font-medium hover:text-brand-700">{it.productName}</Link>
                    <p className="text-xs text-muted">{it.variantName}</p>
                    {it.issue && <Badge tone="red" className="mt-1 w-fit">{it.issue}</Badge>}
                    <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                      <p className="font-bold">{rupiah(it.price)}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => mutate(it.id, () => call<Cart>(`/cart/items/${it.id}`, { method: "DELETE" }))} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-rose-50 hover:text-rose-600" aria-label="Hapus">
                          <IconTrash size={18} />
                        </button>
                        <div className="flex items-center rounded-lg border border-line">
                          <button disabled={it.quantity <= 1 || !!busy} onClick={() => mutate(it.id, () => call<Cart>(`/cart/items/${it.id}`, { method: "PATCH", body: { quantity: it.quantity - 1 } }))} className="grid size-9 place-items-center text-brand-700 disabled:text-slate-300" aria-label="Kurangi">
                            <IconMinus size={16} />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">{it.quantity}</span>
                          <button disabled={it.quantity >= it.stock || !!busy} onClick={() => mutate(it.id, () => call<Cart>(`/cart/items/${it.id}`, { method: "PATCH", body: { quantity: it.quantity + 1 } }))} className="grid size-9 place-items-center text-brand-700 disabled:text-slate-300" aria-label="Tambah">
                            <IconPlus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div>
        <Card className="sticky top-24 p-5">
          <h2 className="font-bold">Ringkasan</h2>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-muted">Subtotal ({cart.count} barang)</span>
            <span className="font-semibold">{rupiah(cart.subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-muted">Ongkir & voucher dihitung di langkah berikutnya.</p>
          {cart.hasIssues && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">Ada produk yang tidak tersedia atau stoknya kurang. Ubah atau hapus sebelum checkout.</p>}
          <ButtonLink href="/checkout" block size="lg" className={cx("mt-4", (cart.hasIssues || !cart.count) && "pointer-events-none opacity-50")} aria-disabled={cart.hasIssues}>
            Lanjut ke checkout
          </ButtonLink>
        </Card>
      </div>
    </div>
  );
}
