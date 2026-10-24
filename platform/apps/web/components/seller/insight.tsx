"use client";

import { useState } from "react";
import { call, ClientApiError } from "@/lib/client";
import { Button } from "../ui";
import { IconSparkles } from "../icons";

/** Ringkasan performa oleh AI, dihitung dari angka penjualan nyata di server. */
export function AiInsight() {
  const [data, setData] = useState<{ summary: string; actions: string[]; source: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div id="insight-ai" className="scroll-mt-28 rounded-3xl border border-leaf-100 bg-gradient-to-br from-leaf-50 via-white to-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2.5 font-bold text-ink"><span className="grid size-9 place-items-center rounded-full bg-leafy text-white"><IconSparkles size={16} /></span> Insight AI untuk tokomu</p>
        <Button size="sm" variant="ai" disabled={busy} onClick={async () => {
          setBusy(true);
          setError(null);
          try { setData(await call("/ai/seller/insight")); } catch (e) { setError(e instanceof ClientApiError ? e.message : "Gagal memuat insight"); } finally { setBusy(false); }
        }}>
          {busy ? "Menganalisis…" : data ? "Perbarui" : "Analisis sekarang"}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
      {data ? (
        <div className="mt-3 text-sm animate-fade-in">
          <p className="text-slate-800">{data.summary}</p>
          {data.actions.length > 0 && <ul className="mt-2 space-y-1">{data.actions.map((a) => <li key={a} className="flex gap-2"><span className="text-leaf-600">→</span>{a}</li>)}</ul>}
          <p className="mt-2 text-[11px] text-muted">Berdasarkan data penjualan 30 hari terakhir{data.source === "rules" ? " (analisis otomatis tanpa AI)" : ""}. Saran saja; tidak ada yang diubah otomatis.</p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">Ringkasan performa dan saran tindakan dari angka penjualan, stok, dan pesananmu.</p>
      )}
    </div>
  );
}
