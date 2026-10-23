"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { IconSearch, IconSparkles } from "./icons";
import { useAssistant } from "./assistant";

/** Kolom pencarian pintar: bisa kata kunci atau kalimat biasa. */
export function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const { open } = useAssistant();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex h-11 flex-1 items-center rounded-xl border border-line bg-white pl-3 pr-1 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15"
    >
      <IconSearch size={18} className="shrink-0 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder='Coba: "sepatu lari di bawah 500 ribu"'
        aria-label="Cari produk"
        maxLength={300}
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] placeholder:text-slate-400 focus:outline-none"
        enterKeyHint="search"
      />
      <button
        type="button"
        onClick={() => open(q.trim() || undefined)}
        className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-brand-50 px-2.5 text-xs font-bold text-brand-700 hover:bg-brand-100"
        title="Tanya Shopia AI"
      >
        <IconSparkles size={16} /> <span className="hidden sm:inline">Tanya AI</span>
      </button>
    </form>
  );
}
