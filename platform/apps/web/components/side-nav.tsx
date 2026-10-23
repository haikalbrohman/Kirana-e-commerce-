"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "./ui";

/** Navigasi area kerja (penjual/admin): tab bergeser di HP, sidebar di desktop. */
export function SideNav({ items, title }: { title: string; items: { href: string; label: string; icon: ReactNode; exact?: boolean }[] }) {
  const path = usePathname();
  return (
    <nav aria-label={title} className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 pb-px scrollbar-none lg:mx-0 lg:flex-col lg:border-0 lg:px-0">
      <p className="hidden px-3 pb-2 text-xs font-bold uppercase tracking-wide text-muted lg:block">{title}</p>
      {items.map((it) => {
        const active = it.exact ? path === it.href : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition lg:rounded-xl lg:border-0 lg:py-2.5",
              active ? "border-brand-600 text-brand-700 lg:bg-brand-50" : "border-transparent text-muted hover:text-ink lg:hover:bg-slate-50",
            )}
          >
            {it.icon} {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
