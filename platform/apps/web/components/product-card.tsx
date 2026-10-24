import Link from "next/link";
import type { ProductCard as Card } from "@/lib/types";
import { shortNumber } from "@/lib/format";
import { IconStar } from "./icons";
import { CompareToggle } from "./compare";
import { Price, ProductImage } from "./ui";

export function ProductCard({ p, priority }: { p: Card; priority?: boolean }) {
  return (
    <Link
      href={`/p/${p.id}`}
      prefetch={priority ? true : undefined}
      className="group relative flex flex-col overflow-hidden rounded-[26px] bg-white p-1.5 shadow-soft ring-1 ring-line/60 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative">
        <ProductImage src={p.imageUrl} alt={p.name} icon={p.category.icon} className="rounded-[20px]" />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {p.discountPercent > 0 && <span className="rounded-full bg-lime-300 px-2 py-0.5 text-[11px] font-extrabold text-ink shadow-sm">-{p.discountPercent}%</span>}
          {p.isNew && <span className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-bold text-brand-800 backdrop-blur">Baru</span>}
        </div>
        <CompareToggle id={p.id} name={p.name} className="absolute right-2 top-2 opacity-90" />
        {!p.inStock && <div className="absolute inset-x-2 bottom-2 rounded-full bg-ink/75 py-1 text-center text-xs font-semibold text-white backdrop-blur">Stok habis</div>}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-2 pb-2 pt-2.5">
        <h3 className="line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-snug text-ink sm:text-sm">{p.name}</h3>
        <Price price={p.price} compareAt={p.compareAtPrice} size="sm" from={p.hasMultiplePrices} />
        <div className="mt-auto flex items-center gap-1 pt-1 text-[11px] text-muted sm:text-xs">
          {p.ratingCount > 0 ? (
            <>
              <IconStar size={12} className="fill-amber-400 text-amber-400" />
              <span className="font-semibold text-ink">{p.ratingAvg.toFixed(1)}</span>
              <span>·</span>
            </>
          ) : null}
          <span>{p.soldCount > 0 ? `${shortNumber(p.soldCount)} terjual` : "Belum terjual"}</span>
        </div>
        <p className="truncate text-[11px] text-muted sm:text-xs">
          {p.store.isUmkm && <span className="mr-1 font-semibold text-brand-700">UMKM</span>}
          {p.store.city ?? p.store.name}
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({ items, className }: { items: Card[]; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 ${className ?? ""}`}>
      {items.map((p, i) => (
        <div key={p.id} className="animate-slide-up" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
          <ProductCard p={p} priority={i < 4} />
        </div>
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-[26px] bg-white p-1.5 ring-1 ring-line/60">
          <div className="skeleton aspect-square rounded-[20px]" />
          <div className="space-y-2 p-3">
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-3.5 w-2/3" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Deretan produk yang bisa digeser (untuk penawaran / rekomendasi) */
export function ProductRail({ items }: { items: Card[] }) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 scrollbar-none">
      {items.map((p) => (
        <div key={p.id} className="w-40 shrink-0 snap-start sm:w-48">
          <ProductCard p={p} />
        </div>
      ))}
    </div>
  );
}
