"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { IconAlert, IconCheck, IconX } from "./icons";

type Toast = { id: number; title: string; text?: string; tone: "success" | "error" | "info"; action?: { label: string; href: string } };
const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lift animate-slide-up">
            <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${t.tone === "error" ? "bg-rose-500" : "bg-brand-500"}`}>
              {t.tone === "error" ? <IconAlert size={14} /> : <IconCheck size={14} />}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{t.title}</p>
              {t.text && <p className="truncate text-slate-300">{t.text}</p>}
            </div>
            {t.action && (
              <a href={t.action.href} className="shrink-0 text-sm font-bold text-brand-300 hover:text-brand-200">
                {t.action.label}
              </a>
            )}
            <button onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} className="text-slate-400 hover:text-white" aria-label="Tutup">
              <IconX size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export const useToast = () => useContext(ToastContext);
