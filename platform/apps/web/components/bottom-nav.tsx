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
    <Link href={href} className={cx("relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition", active ? "text-brand-700" : "text-muted")} aria-current={active ? "page" : undefined}>
      {icon}
      {label}
      {!!badge && <span className="absolute right-[calc(50%-20px)] top-1 grid min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{badge > 99 ? "99+" : badge}</span>}
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 pb-safe backdrop-blur lg:hidden" aria-label="Navigasi utama">
      <div className="mx-auto flex max-w-lg items-end">
        {item("/", "Beranda", <IconHome />, path === "/")}
        {item("/search", "Kategori", <IconGrid />, path.startsWith("/search") || path.startsWith("/c/"))}
        <button onClick={() => open()} className="flex flex-1 flex-col items-center gap-0.5 pb-2 text-[11px] font-semibold text-brand-700">
          <span className="-mt-5 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift ring-4 ring-white">
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
