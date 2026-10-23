"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { call, ClientApiError } from "@/lib/client";
import type { ProductDetail } from "@/lib/types";
import { useToast } from "./toast";
import { Button, cx, Price } from "./ui";
import { IconCart, IconMinus, IconPlus } from "./icons";
import { CompareToggle } from "./compare";

/** Galeri foto dengan thumbnail */
export function Gallery({ images, name, icon }: { images: { url: string; alt: string | null }[]; name: string; icon: string | null }) {
  const [i, setI] = useState(0);
  if (!images.length)
    return <div className="grid aspect-square place-items-center rounded-3xl bg-gradient-to-br from-brand-50 to-slate-100 text-8xl">{icon ?? "🛍️"}</div>;
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={images[i].url} src={images[i].url} alt={images[i].alt ?? name} className="size-full object-cover animate-fade-in" />
        {images.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2 py-0.5 text-xs font-semibold text-white">{i + 1}/{images.length}</span>}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
          {images.map((img, idx) => (
            <button key={img.url} onClick={() => setI(idx)} className={cx("size-16 shrink-0 overflow-hidden rounded-xl border-2 transition", idx === i ? "border-brand-600" : "border-transparent opacity-70 hover:opacity-100")} aria-label={`Foto ${idx + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Pilih varian, jumlah, lalu tambah ke keranjang / beli sekarang */
export function BuyPanel({ product, loggedIn }: { product: ProductDetail; loggedIn: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const dims = useMemo(() => [...new Set(product.variants.flatMap((v) => Object.keys(v.options)))], [product.variants]);
  const [picked, setPicked] = useState<Record<string, string>>(() => (product.variants.length === 1 ? product.variants[0].options : {}));
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<"cart" | "buy" | null>(null);

  const variant = product.variants.length === 1 ? product.variants[0] : product.variants.find((v) => dims.every((d) => v.options[d] === picked[d]));
  const minPrice = Math.min(...product.variants.map((v) => v.price));
  const maxPrice = Math.max(...product.variants.map((v) => v.price));
  const missing = dims.find((d) => !picked[d]);

  // Catat produk yang dilihat (dasar rekomendasi personal)
  useEffect(() => {
    if (loggedIn) call(`/products/${product.id}/view`, { method: "POST" }).catch(() => null);
  }, [loggedIn, product.id]);

  const available = (dim: string, value: string) =>
    product.variants.some((v) => v.options[dim] === value && v.stock > 0 && dims.every((d) => d === dim || !picked[d] || v.options[d] === picked[d]));

  async function add(mode: "cart" | "buy") {
    if (!loggedIn) return router.push(`/login?callbackUrl=${encodeURIComponent(`/p/${product.id}`)}`);
    if (!variant) return toast({ tone: "error", title: `Pilih ${missing ?? "varian"} terlebih dahulu` });
    setBusy(mode);
    try {
      await call("/cart/items", { body: { variantId: variant.id, quantity: qty } });
      if (mode === "buy") router.push("/checkout");
      else {
        toast({ tone: "success", title: "Ditambahkan ke keranjang", text: `${product.name} · ${variant.name}`, action: { label: "Lihat", href: "/cart" } });
        router.refresh();
      }
    } catch (e) {
      toast({ tone: "error", title: e instanceof ClientApiError ? e.message : "Gagal menambahkan" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        {variant ? <Price price={variant.price} compareAt={variant.compareAtPrice} size="lg" /> : <span className="text-3xl font-extrabold tracking-tight">{minPrice === maxPrice ? `Rp${minPrice.toLocaleString("id-ID")}` : `Rp${minPrice.toLocaleString("id-ID")} – Rp${maxPrice.toLocaleString("id-ID")}`}</span>}
        <CompareToggle id={product.id} name={product.name} className="!size-10 shrink-0 border border-line" />
      </div>

      {dims.map((dim) => (
        <div key={dim} className="mt-5">
          <p className="mb-2 text-sm font-semibold">
            {dim}: <span className="font-normal text-muted">{picked[dim] ?? "pilih"}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(product.variants.map((v) => v.options[dim]).filter(Boolean))].map((value) => {
              const ok = available(dim, value);
              const active = picked[dim] === value;
              return (
                <button
                  key={value}
                  disabled={!ok && !active}
                  onClick={() =>
                    setPicked((p) => {
                      const next = { ...p };
                      if (active) delete next[dim];
                      else next[dim] = value;
                      return next;
                    })
                  }
                  className={cx("min-w-12 rounded-xl border px-3.5 py-2 text-sm font-medium transition", active ? "border-brand-600 bg-brand-50 text-brand-800 ring-2 ring-brand-600/20" : "border-line bg-white hover:border-brand-300", !ok && !active && "cursor-not-allowed text-slate-300 line-through")}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-5 flex items-center gap-4">
        <div className="flex items-center rounded-xl border border-line bg-white">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-11 place-items-center text-brand-700 disabled:text-slate-300" disabled={qty <= 1} aria-label="Kurangi">
            <IconMinus size={18} />
          </button>
          <span className="w-10 text-center font-bold" aria-live="polite">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(variant?.stock ?? 99, q + 1))} className="grid size-11 place-items-center text-brand-700 disabled:text-slate-300" disabled={!!variant && qty >= variant.stock} aria-label="Tambah">
            <IconPlus size={18} />
          </button>
        </div>
        <p className={cx("text-sm", variant && variant.stock <= 5 ? "font-semibold text-rose-600" : "text-muted")}>
          {variant ? (variant.stock > 0 ? `Stok: ${variant.stock}` : "Stok habis") : `Total stok: ${product.totalStock}`}
        </p>
      </div>

      {/* Tombol aksi: menempel di bawah layar HP */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-line bg-white/95 p-3 pb-safe backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0">
        <Button variant="secondary" size="lg" className="flex-1" disabled={!!busy || (variant && variant.stock === 0) || product.totalStock === 0} onClick={() => add("cart")}>
          <IconCart size={18} /> {busy === "cart" ? "Menambahkan…" : "Keranjang"}
        </Button>
        <Button size="lg" className="flex-1" disabled={!!busy || (variant && variant.stock === 0) || product.totalStock === 0} onClick={() => add("buy")}>
          {busy === "buy" ? "Memproses…" : "Beli sekarang"}
        </Button>
      </div>
    </div>
  );
}
