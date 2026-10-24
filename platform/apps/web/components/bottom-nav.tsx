"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCart, IconGrid, IconHome, IconSparkles, IconUser } from "./icons";
import { useAssistant } from "./assistant";
import { cx } from "./ui";

/** Navigasi bawah untuk HP (disembunyikan di layar besar). */
export function BottomNav({ cartCount }: { cartCount: number }) {
  const path = usePathname();
  const { open } = useAssistant();
  const hidden = /^\/(seller|admin|checkout|p\/)/.test(path);
  if (hidden) return null;
  const item = (href: string, label: string, icon: React.ReactNode, active: boolean, badge?: number) => (
    <Link href={href} className={cx("relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition", active ? "text-brand-700" : "text-muted")} aria-current={active ? "page" : undefined}>
      <span className={cx("grid h-7 w-12 place-items-center rounded-full transition", active && "bg-brand-100")}>{icon}</span>
      {label}
      {!!badge && <span className="absolute right-[calc(50%-22px)] top-1 grid min-w-4 place-items-center rounded-full bg-lime-300 px-1 text-[10px] font-extrabold text-ink ring-2 ring-white">{badge > 99 ? "99+" : badge}</span>}
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-safe lg:hidden" aria-label="Navigasi utama">
      <div className="mx-auto mb-2 flex max-w-lg items-end rounded-[28px] border border-line/70 bg-white/95 px-1 shadow-lift backdrop-blur">
        {item("/", "Beranda", <IconHome />, path === "/")}
        {item("/search", "Kategori", <IconGrid />, path.startsWith("/search") || path.startsWith("/c/"))}
        <button onClick={() => open()} className="flex flex-1 flex-col items-center gap-0.5 pb-2 text-[11px] font-bold text-leaf-700">
          <span className="-mt-5 grid size-13 place-items-center rounded-full bg-leafy text-white shadow-lg shadow-leaf-500/40 ring-4 ring-white">
            <IconSparkles />
          </span>
          Shopia AI
        </button>
        {item("/cart", "Keranjang", <IconCart />, path === "/cart", cartCount)}
        {item("/account", "Akun", <IconUser />, path.startsWith("/account") || path.startsWith("/orders"))}
      </div>
    </nav>
  );
}
