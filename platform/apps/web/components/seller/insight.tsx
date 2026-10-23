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
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-bold text-brand-900"><IconSparkles size={18} /> Insight AI untuk tokomu</p>
        <Button size="sm" variant="secondary" disabled={busy} onClick={async () => {
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
          {data.actions.length > 0 && <ul className="mt-2 space-y-1">{data.actions.map((a) => <li key={a} className="flex gap-2"><span className="text-brand-600">→</span>{a}</li>)}</ul>}
          <p className="mt-2 text-[11px] text-muted">Berdasarkan data penjualan 30 hari terakhir{data.source === "rules" ? " (analisis otomatis tanpa AI)" : ""}. Saran saja; tidak ada yang diubah otomatis.</p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">Ringkasan performa dan saran tindakan dari angka penjualan, stok, dan pesananmu.</p>
      )}
    </div>
  );
}
