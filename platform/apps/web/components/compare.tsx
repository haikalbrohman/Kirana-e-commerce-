"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { IconCompare, IconX } from "./icons";
import { buttonClass, cx } from "./ui";
import { useToast } from "./toast";

type Item = { id: string; name: string };
type Ctx = { items: Item[]; toggle: (item: Item) => void; remove: (id: string) => void; clear: () => void; has: (id: string) => boolean };
const CompareContext = createContext<Ctx | null>(null);
const KEY = "shopia_compare";
const MAX = 4;

// Penyimpanan perbandingan di localStorage, dibaca lewat useSyncExternalStore (aman untuk SSR)
const EMPTY: Item[] = [];
let cache: Item[] | null = null;
const listeners = new Set<() => void>();
function read(): Item[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    cache = [];
  }
  return cache!;
}
function write(next: Item[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* penyimpanan diblokir */
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toast = useToast();
  const value: Ctx = {
    items,
    has: (id) => items.some((i) => i.id === id),
    toggle: (item) => {
      if (items.some((i) => i.id === item.id)) return write(items.filter((i) => i.id !== item.id));
      if (items.length >= MAX) return toast({ tone: "error", title: `Maksimal ${MAX} produk untuk dibandingkan` });
      write([...items, item]);
      toast({ tone: "success", title: "Ditambahkan ke perbandingan", text: item.name, action: items.length >= 1 ? { label: "Bandingkan", href: `/compare?ids=${[...items, item].map((i) => i.id).join(",")}` } : undefined });
    },
    remove: (id) => write(items.filter((i) => i.id !== id)),
    clear: () => write([]),
  };
  return <CompareContext value={value}>{children}</CompareContext>;
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare harus di dalam CompareProvider");
  return ctx;
}

export function CompareToggle({ id, name, className }: { id: string; name: string; className?: string }) {
  const { has, toggle } = useCompare();
  const active = has(id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        toggle({ id, name });
      }}
      aria-pressed={active}
      title={active ? "Hapus dari perbandingan" : "Bandingkan"}
      className={cx("grid size-8 place-items-center rounded-full backdrop-blur transition", active ? "bg-brand-600 text-white" : "bg-white/90 text-slate-600 hover:text-brand-700", className)}
    >
      <IconCompare size={16} />
    </button>
  );
}

/** Baki mengambang yang muncul saat ada produk dipilih untuk dibandingkan */
export function CompareTray() {
  const { items, remove, clear } = useCompare();
  const path = usePathname();
  if (!items.length || /^\/(checkout|pay|payments|compare|seller|admin)/.test(path)) return null;
  return (
    <div className="fixed inset-x-3 bottom-[84px] z-40 mx-auto max-w-xl rounded-2xl border border-line bg-white p-3 shadow-lift animate-slide-up lg:bottom-6">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scrollbar-none">
          {items.map((i) => (
            <span key={i.id} className="flex max-w-40 shrink-0 items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-xs font-medium text-brand-800">
              <span className="truncate">{i.name}</span>
              <button onClick={() => remove(i.id)} className="grid size-5 place-items-center rounded-full hover:bg-brand-100" aria-label={`Hapus ${i.name}`}>
                <IconX size={12} />
              </button>
            </span>
          ))}
        </div>
        <button onClick={clear} className="text-xs font-semibold text-muted hover:text-ink">
          Hapus
        </button>
        <Link href={`/compare?ids=${items.map((i) => i.id).join(",")}`} aria-disabled={items.length < 2} className={cx(buttonClass({ size: "sm" }), items.length < 2 && "pointer-events-none opacity-50")}>
          <IconCompare size={16} /> Bandingkan
        </Link>
      </div>
      {items.length < 2 && <p className="mt-1.5 text-xs text-muted">Pilih minimal 2 produk untuk dibandingkan.</p>}
    </div>
  );
}
