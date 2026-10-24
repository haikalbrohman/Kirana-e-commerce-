"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { call, ClientApiError } from "@/lib/client";
import type { ProductDetail } from "@/lib/types";
import { useToast } from "./toast";
import { Button, cx, Price } from "./ui";
import { IconCart, IconCheck, IconMinus, IconPlus } from "./icons";
import { rupiah } from "@/lib/format";
import { CompareToggle } from "./compare";

/** Galeri foto dalam kartu gradasi, indikator titik, dan thumbnail */
export function Gallery({ images, name, icon }: { images: { url: string; alt: string | null }[]; name: string; icon: string | null }) {
  const [i, setI] = useState(0);
  if (!images.length)
    return <div className="grid aspect-square place-items-center rounded-[32px] bg-aurora text-8xl shadow-lift">{icon ?? "🛍️"}</div>;
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[32px] bg-aurora shadow-lift">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={images[i].url} src={images[i].url} alt={images[i].alt ?? name} className="size-full object-cover animate-fade-in" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-950/35 to-transparent" />
        {images.length > 1 && (
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-1.5 backdrop-blur-md" aria-hidden="true">
            {images.map((img, idx) => (
              <span key={img.url} className={cx("h-1.5 rounded-full bg-white transition-all", idx === i ? "w-5" : "w-1.5 opacity-60")} />
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto p-1 scrollbar-none">
          {images.map((img, idx) => (
            <button key={img.url} onClick={() => setI(idx)} className={cx("size-16 shrink-0 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-canvas transition", idx === i ? "ring-brand-600" : "ring-transparent opacity-70 hover:opacity-100")} aria-label={`Foto ${idx + 1}`}>
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
  const [added, setAdded] = useState(false);

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
        setAdded(true);
        setTimeout(() => setAdded(false), 2500);
        toast({ tone: "success", title: "Ditambahkan ke keranjang", text: `${product.name} · ${variant.name}`, action: { label: "Lihat", href: "/cart" } });
        router.refresh();
      }
    } catch (e) {
      toast({ tone: "error", title: e instanceof ClientApiError ? e.message : "Gagal menambahkan" });
    } finally {
      setBusy(null);
    }
  }

  const lastDim = dims[dims.length - 1];
  const soldOut = (variant && variant.stock === 0) || product.totalStock === 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        {variant ? (
          <Price price={variant.price} compareAt={variant.compareAtPrice} size="lg" />
        ) : (
          <span className="text-[34px] font-bold leading-none tracking-tight">{minPrice === maxPrice ? rupiah(minPrice) : `${rupiah(minPrice)} – ${rupiah(maxPrice)}`}</span>
        )}
        <CompareToggle id={product.id} name={product.name} className="!size-11 shrink-0 !rounded-full border border-line" />
      </div>
      <p className="mt-1 text-xs text-muted">Harga sudah termasuk PPN · ongkir dihitung saat checkout</p>

      <div id="pilih-varian" className="scroll-mt-28">
        {dims.map((dim) => {
          const values = [...new Set(product.variants.map((v) => v.options[dim]).filter(Boolean))];
          // Nilai pendek (S/M/L/XL, 39/40) memakai pil lime bersegmen seperti panduan ukuran
          const compact = values.every((v) => v.length <= 4);
          return (
            <div key={dim} className="mt-6">
              <p className="mb-2.5 flex items-baseline justify-between text-sm font-bold">
                {dim}
                <span className="font-medium text-muted">{picked[dim] ?? "pilih salah satu"}</span>
              </p>
              <div className={cx(compact ? "inline-flex max-w-full flex-wrap gap-1 rounded-[26px] bg-lime-300 p-1.5 shadow-glow" : "flex flex-wrap gap-2")}>
                {values.map((value) => {
                  const ok = available(dim, value);
                  const active = picked[dim] === value;
                  return (
                    <button
                      key={value}
                      disabled={!ok && !active}
                      aria-pressed={active}
                      onClick={() =>
                        setPicked((p) => {
                          const next = { ...p };
                          if (active) delete next[dim];
                          else next[dim] = value;
                          return next;
                        })
                      }
                      className={cx(
                        "rounded-full text-sm font-bold transition",
                        compact
                          ? cx("grid h-10 min-w-10 place-items-center px-2.5", active ? "bg-ink text-lime-300" : "text-ink hover:bg-white/50")
                          : cx("flex h-10 items-center gap-2 border px-4", active ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-brand-300"),
                        !ok && !active && "cursor-not-allowed opacity-35 line-through",
                      )}
                    >
                      {!compact && <span className={cx("size-2.5 rounded-full", active ? "bg-lime-300" : "bg-brand-200")} />}
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex items-center rounded-full bg-white p-1 ring-1 ring-line">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-10 place-items-center rounded-full text-ink hover:bg-brand-50 disabled:text-slate-300" disabled={qty <= 1} aria-label="Kurangi">
            <IconMinus size={18} />
          </button>
          <span className="w-9 text-center text-lg font-bold" aria-live="polite">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(variant?.stock ?? 99, q + 1))} className="grid size-10 place-items-center rounded-full bg-ink text-white hover:bg-brand-950 disabled:bg-slate-200" disabled={!!variant && qty >= variant.stock} aria-label="Tambah">
            <IconPlus size={18} />
          </button>
        </div>
        <p className={cx("text-sm", variant && variant.stock <= 5 ? "font-bold text-rose-600" : "text-muted")}>
          {variant ? (variant.stock > 0 ? `Stok: ${variant.stock}` : "Stok habis") : `Total stok: ${product.totalStock}`}
        </p>
      </div>

      {/* Tombol aksi: menempel di bawah layar HP — [pilihan] [keranjang] [beli] */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe sm:static sm:mt-7 sm:px-0">
        <div className="mx-auto mb-2 flex max-w-lg items-center gap-2 rounded-full border border-line/70 bg-white/95 p-1.5 shadow-lift backdrop-blur sm:mb-0 sm:max-w-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          {lastDim && (
            <button
              type="button"
              onClick={() => document.getElementById("pilih-varian")?.scrollIntoView({ behavior: "smooth" })}
              className="grid size-13 shrink-0 place-items-center rounded-full bg-white text-center leading-none ring-1 ring-line"
              aria-label={`${lastDim}: ${picked[lastDim] ?? "belum dipilih"}`}
            >
              <span>
                <span className={cx("block max-w-11 truncate text-base font-bold", !picked[lastDim] && "text-rose-500")}>{picked[lastDim] ?? "?"}</span>
                <span className="mt-0.5 block max-w-11 truncate text-[9px] font-medium text-muted">{lastDim}</span>
              </span>
            </button>
          )}
          <Button size="lg" className="min-w-0 flex-1 !px-3 uppercase tracking-wide" disabled={!!busy || soldOut} onClick={() => add("cart")}>
            {added ? <><IconCheck size={18} /> Ditambahkan</> : <><IconCart size={18} /> {busy === "cart" ? "Menambahkan…" : "Keranjang"}</>}
          </Button>
          <Button variant="dark" size="lg" className="min-w-0 flex-1 !px-3" disabled={!!busy || soldOut} onClick={() => add("buy")}>
            {busy === "buy" ? "Memproses…" : "Beli sekarang"}
          </Button>
        </div>
      </div>
    </div>
  );
}
