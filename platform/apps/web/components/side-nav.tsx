"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "./ui";

/** Navigasi area kerja (penjual/admin): pil bergeser di HP, panel samping di desktop. */
export function SideNav({ items, title, footer }: { title: string; items: { href: string; label: string; icon: ReactNode; exact?: boolean }[]; footer?: ReactNode }) {
  const path = usePathname();
  return (
    <div className="lg:flex lg:min-h-[calc(100dvh-8rem)] lg:flex-col lg:rounded-[28px] lg:bg-white lg:p-3 lg:shadow-soft lg:ring-1 lg:ring-line/60">
      <nav aria-label={title} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none lg:mx-0 lg:flex-col lg:gap-1 lg:px-0">
        <p className="hidden px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-muted lg:block">{title}</p>
        {items.map((it) => {
          const active = it.exact ? path === it.href : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold transition",
                active ? "bg-leaf-300 text-leaf-900 shadow-sm" : "bg-white text-muted ring-1 ring-line hover:text-ink lg:bg-transparent lg:ring-0 lg:hover:bg-canvas",
              )}
            >
              {it.icon} {it.label}
            </Link>
          );
        })}
      </nav>
      {footer && <div className="mt-auto hidden pt-6 lg:block">{footer}</div>}
    </div>
  );
}

/** Kartu promosi AI di bawah sidebar (desktop). */
export function AiSideCard({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <div className="rounded-3xl bg-canvas p-4">
      <span className="grid size-10 place-items-center rounded-full bg-leafy text-white shadow-md shadow-leaf-500/30">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>
      </span>
      <p className="mt-3 font-bold leading-snug">{title}</p>
      <p className="mt-1 text-xs text-muted">{text}</p>
      <Link href={href} className="mt-3 flex h-9 items-center justify-center rounded-full bg-ink text-xs font-bold text-lime-300 hover:bg-brand-950">{cta}</Link>
    </div>
  );
}
