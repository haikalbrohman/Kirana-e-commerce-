"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconX } from "./icons";
import { cx } from "./ui";

/** Panel bawah di HP, dialog di tengah pada layar besar. Bisa ditutup dengan Escape/klik latar. */
export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div ref={ref} tabIndex={-1} className={cx("relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-2xl outline-none animate-slide-up sm:rounded-3xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-slate-100" aria-label="Tutup">
            <IconX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
