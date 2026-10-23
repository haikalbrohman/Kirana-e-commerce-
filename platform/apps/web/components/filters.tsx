"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { Category } from "@/lib/types";
import { IconFilter, IconStar } from "./icons";
import { Sheet } from "./sheet";
import { Button, cx, Input, Select } from "./ui";

export const SORT_OPTIONS = [
  ["", "Paling sesuai"],
  ["popular", "Terlaris"],
  ["newest", "Terbaru"],
  ["price_asc", "Harga terendah"],
  ["price_desc", "Harga tertinggi"],
  ["rating", "Rating tertinggi"],
] as const;

function useParamsUpdater() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    start(() => router.push(`${path}?${next.toString()}`, { scroll: false }));
  };
  return { params, update, pending };
}

export function SortSelect() {
  const { params, update, pending } = useParamsUpdater();
  return (
    <Select aria-label="Urutkan" value={params.get("sort") ?? ""} onChange={(e) => update({ sort: e.target.value || null })} className={cx("!h-10 w-auto text-sm", pending && "opacity-60")}>
      {SORT_OPTIONS.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </Select>
  );
}

function FilterForm({ categories, fixedCategory, onDone }: { categories: Category[]; fixedCategory?: string; onDone?: () => void }) {
  const { params, update, pending } = useParamsUpdater();
  const [min, setMin] = useState(params.get("minPrice") ?? "");
  const [max, setMax] = useState(params.get("maxPrice") ?? "");
  const category = params.get("category");
  const rating = params.get("minRating");
  const apply = (changes: Record<string, string | null>) => {
    update(changes);
    onDone?.();
  };
  return (
    <div className={cx("space-y-6", pending && "opacity-60")}>
      {!fixedCategory && (
        <div>
          <p className="mb-2 text-sm font-bold">Kategori</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={c.id} onClick={() => apply({ category: category === c.slug ? null : c.slug })} className={cx("rounded-full border px-3 py-1.5 text-sm transition", category === c.slug ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:border-brand-300")}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="mb-2 text-sm font-bold">Rentang harga</p>
        <div className="flex items-center gap-2">
          <Input inputMode="numeric" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} aria-label="Harga minimum" />
          <span className="text-muted">–</span>
          <Input inputMode="numeric" placeholder="Maks" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} aria-label="Harga maksimum" />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[["", "100000", "< 100rb"], ["100000", "500000", "100–500rb"], ["500000", "", "> 500rb"]].map(([a, b, l]) => (
            <button key={l} onClick={() => apply({ minPrice: a || null, maxPrice: b || null })} className="rounded-full border border-line bg-white px-3 py-1 text-xs hover:border-brand-300">
              {l}
            </button>
          ))}
        </div>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => apply({ minPrice: min || null, maxPrice: max || null })}>
          Terapkan harga
        </Button>
      </div>
      <div>
        <p className="mb-2 text-sm font-bold">Rating</p>
        <div className="flex flex-wrap gap-2">
          {["4.5", "4", "3"].map((r) => (
            <button key={r} onClick={() => apply({ minRating: rating === r ? null : r })} className={cx("inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm", rating === r ? "border-brand-600 bg-brand-50 font-semibold text-brand-800" : "border-line bg-white")}>
              <IconStar size={14} className="fill-amber-400 text-amber-400" /> {r}+
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => apply({ category: fixedCategory ? null : null, minPrice: null, maxPrice: null, minRating: null, sort: null })} className="text-sm font-semibold text-muted hover:text-ink">
        Reset filter
      </button>
    </div>
  );
}

export function Filters(props: { categories: Category[]; fixedCategory?: string }) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const active = ["category", "minPrice", "maxPrice", "minRating"].filter((k) => params.get(k)).length;
  return (
    <>
      <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen(true)}>
        <IconFilter size={16} /> Filter{active ? ` (${active})` : ""}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Filter produk">
        <FilterForm {...props} onDone={() => setOpen(false)} />
      </Sheet>
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-line bg-white p-5">
          <p className="mb-4 font-bold">Filter</p>
          <FilterForm {...props} />
        </div>
      </aside>
    </>
  );
}
