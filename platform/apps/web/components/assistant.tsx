"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { call } from "@/lib/client";
import { rupiah } from "@/lib/format";
import type { ProductCard } from "@/lib/types";
import { IconSend, IconSparkles, IconStar, IconX } from "./icons";
import { cx, ProductImage } from "./ui";
import { CompareToggle } from "./compare";

type Msg = { role: "user" | "assistant"; content: string; products?: ProductCard[]; followUp?: string | null; error?: boolean };

const STORAGE_KEY = "shopia_assistant";
const SUGGESTIONS = [
  "Carikan sepatu lari di bawah Rp500.000",
  "Hadiah ulang tahun untuk ibu",
  "Laptop untuk mahasiswa budget Rp7 juta",
  "Tas kerja hitam muat laptop 14 inci",
  "Produk kualitas bagus tapi terjangkau",
];
const GREETING: Msg = {
  role: "assistant",
  content: "Hai! Aku Shopia AI 👋 Ceritakan apa yang kamu cari: untuk siapa, kebutuhannya, dan budget-nya. Aku carikan dari produk yang benar-benar tersedia di Shopia.",
};

const AssistantContext = createContext<{ open: (prompt?: string) => void }>({ open: () => {} });
export const useAssistant = () => useContext(AssistantContext);

/** Penyedia panel asisten (laci di sisi kanan/bawah layar). */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | undefined>();
  return (
    <AssistantContext
      value={{
        open: (p) => {
          setPrompt(p);
          setOpen(true);
        },
      }}
    >
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label="Shopia AI">
          <div className="absolute inset-0 bg-brand-950/30 backdrop-blur-[2px] animate-fade-in" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative flex h-dvh w-full flex-col bg-white shadow-2xl animate-slide-up sm:m-3 sm:h-[calc(100dvh-1.5rem)] sm:max-w-md sm:overflow-hidden sm:rounded-[32px]">
            <AssistantChat initialPrompt={prompt} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </AssistantContext>
  );
}

export function AssistantChat({ initialPrompt, onClose, fullPage }: { initialPrompt?: string; onClose?: () => void; fullPage?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
      if (Array.isArray(saved) && saved.length) setMessages(saved);
    } catch {
      /* abaikan */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      /* abaikan */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const history = next.filter((m) => !m.error && m !== GREETING).map(({ role, content }) => ({ role, content })).slice(-12);
      const res = await call<{ reply: string; products: ProductCard[]; followUp: string | null }>("/ai/assistant", { body: { messages: history } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, products: res.products, followUp: res.followUp }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: (e as Error).message || "Maaf, terjadi gangguan. Coba lagi ya.", error: true }]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialPrompt && !sentInitial.current) {
      sentInitial.current = true;
      void send(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  return (
    <>
      <div className="flex items-center gap-3 bg-white px-4 py-3">
        <span className="grid size-10 place-items-center rounded-full bg-leafy text-white shadow-md shadow-leaf-500/30">
          <IconSparkles size={18} />
        </span>
        <div className="flex-1">
          <p className="text-[17px] font-bold leading-tight">Shopia AI</p>
          <p className="flex items-center gap-1.5 text-xs text-muted"><span className="size-1.5 rounded-full bg-leaf-500" /> Asisten belanja · dari katalog Shopia</p>
        </div>
        <button onClick={() => setMessages([GREETING])} className="rounded-full px-3 py-1.5 text-xs font-bold text-muted ring-1 ring-line hover:bg-canvas">
          Mulai ulang
        </button>
        {onClose && (
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-canvas hover:bg-line" aria-label="Tutup">
            <IconX size={18} />
          </button>
        )}
      </div>

      <div ref={listRef} className={cx("flex-1 space-y-4 overflow-y-auto bg-white px-4 py-3", fullPage && "min-h-[50vh]")}>
        {messages.map((m, i) => (
          <div key={i} className={cx("flex flex-col animate-slide-up", m.role === "user" ? "items-end" : "items-start")}>
            <div
              className={cx(
                "max-w-[88%] whitespace-pre-line rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed",
                m.role === "user" ? "rounded-br-lg bg-leaf-300 font-medium text-leaf-900" : "rounded-bl-lg bg-canvas text-ink",
                m.error && "bg-rose-50 text-rose-800",
              )}
            >
              {m.content}
            </div>
            {!!m.products?.length && (
              <p className="mt-2 flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1 text-xs font-bold text-ink">
                <IconSparkles size={13} className="text-leaf-500" /> {m.products.length} produk ditemukan
              </p>
            )}
            {!!m.products?.length && (
              <div className="mt-2 flex w-full gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none">
                {m.products.map((p, idx) => (
                  <Link key={p.id} href={`/p/${p.id}`} onClick={onClose} className="group relative w-40 shrink-0 overflow-hidden rounded-[24px] bg-white p-1.5 shadow-soft ring-1 ring-line/70 transition hover:-translate-y-0.5">
                    {idx === 0 && <span className="absolute left-3 top-3 z-10 rounded-full bg-leafy px-2 py-0.5 text-[10px] font-bold text-white shadow">Pilihan AI</span>}
                    <ProductImage src={p.imageUrl} alt={p.name} icon={p.category.icon} className="rounded-[18px]" />
                    <CompareToggle id={p.id} name={p.name} className="absolute right-3 top-3" />
                    <div className="px-1.5 pb-1 pt-2">
                      <p className="line-clamp-2 text-xs font-medium leading-snug">{p.name}</p>
                      <p className="mt-1 text-sm font-extrabold">{rupiah(p.price)}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                        {p.ratingCount > 0 && (
                          <>
                            <IconStar size={11} className="fill-amber-400 text-amber-400" />
                            {p.ratingAvg} ·{" "}
                          </>
                        )}
                        {p.inStock ? "Stok tersedia" : "Stok habis"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {m.followUp && <p className="mt-1.5 max-w-[88%] rounded-3xl rounded-bl-lg bg-leaf-50 px-4 py-2 text-sm text-leaf-800 ring-1 ring-leaf-100">💬 {m.followUp}</p>}
          </div>
        ))}
        {busy && (
          <div className="flex w-16 items-center justify-center gap-1 rounded-3xl rounded-bl-lg bg-canvas px-3 py-3" aria-label="Shopia AI sedang mengetik">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2 animate-bounce rounded-full bg-leaf-500" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-3 pb-safe">
        {messages.length <= 1 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full bg-canvas px-3.5 py-2 text-xs font-semibold text-ink ring-1 ring-line hover:bg-leaf-50 hover:ring-leaf-200">
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 rounded-full bg-canvas p-1.5 pl-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-leaf-400"
        >
          <IconSparkles size={16} className="shrink-0 text-leaf-500" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis kebutuhanmu…"
            maxLength={1000}
            aria-label="Pesan untuk Shopia AI"
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-muted focus:outline-none"
          />
          <button disabled={busy || !input.trim()} className="flex h-10 items-center gap-1.5 rounded-full bg-leafy px-4 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-40" aria-label="Kirim">
            Kirim <IconSend size={15} />
          </button>
        </form>
        <p className="mt-1.5 text-center text-[11px] text-muted">AI bisa keliru. Harga & stok di kartu produk selalu yang terbaru.</p>
      </div>
    </>
  );
}

export function AssistantButton({ className, children, prompt }: { className?: string; children: ReactNode; prompt?: string }) {
  const { open } = useAssistant();
  return (
    <button type="button" onClick={() => open(prompt)} className={className}>
      {children}
    </button>
  );
}
