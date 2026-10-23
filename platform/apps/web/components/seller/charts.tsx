import { rupiah } from "@/lib/format";

/** Grafik batang penjualan harian (SVG ringan, tanpa pustaka tambahan). */
export function SalesChart({ series }: { series: { date: string; revenue: number; orders: number }[] }) {
  const max = Math.max(1, ...series.map((s) => s.revenue));
  const total = series.reduce((n, s) => n + s.revenue, 0);
  const w = 100 / series.length;
  return (
    <figure>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label={`Penjualan ${series.length} hari terakhir, total ${rupiah(total)}`}>
        {[10, 20, 30].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e7ece9" strokeWidth="0.2" />)}
        {series.map((s, i) => {
          const h = (s.revenue / max) * 36;
          return (
            <rect key={s.date} x={i * w + w * 0.15} width={w * 0.7} y={40 - h} height={Math.max(h, s.revenue ? 0.6 : 0.25)} rx="0.4" className={s.revenue ? "fill-brand-500" : "fill-slate-200"}>
              <title>{`${new Date(s.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}: ${rupiah(s.revenue)} (${s.orders} pesanan)`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{new Date(series[0]?.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
        <span>Puncak harian: {rupiah(max)}</span>
        <span>{series.length ? new Date(series[series.length - 1].date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : ""}</span>
      </figcaption>
    </figure>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
