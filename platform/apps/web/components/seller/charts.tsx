import type { ReactNode } from "react";
import { rupiah, shortNumber } from "@/lib/format";

const fmtDay = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

/**
 * Grafik penjualan harian: tiap hari punya dua balok bertumpuk,
 * ungu = pendapatan (atas), hijau = jumlah pesanan (bawah). SVG ringan tanpa pustaka.
 */
export function SalesChart({ series }: { series: { date: string; revenue: number; orders: number }[] }) {
  const maxRev = Math.max(1, ...series.map((s) => s.revenue));
  const maxOrd = Math.max(1, ...series.map((s) => s.orders));
  const total = series.reduce((n, s) => n + s.revenue, 0);
  const orders = series.reduce((n, s) => n + s.orders, 0);
  const w = 100 / Math.max(1, series.length);
  const bw = w * 0.62;
  return (
    <figure>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[28px] font-bold leading-none tracking-tight">{rupiah(total)}</p>
          <p className="mt-1 text-xs text-muted">
            Rata-rata harian <span className="font-bold text-leaf-600">{rupiah(Math.round(total / Math.max(1, series.length)))}</span> · {orders} pesanan
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-muted">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-brand-400" /> Pendapatan</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-leaf-400" /> Pesanan</span>
        </div>
      </div>
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="h-48 w-full" role="img" aria-label={`Penjualan ${series.length} hari terakhir, total ${rupiah(total)}, ${orders} pesanan`}>
        {[12.5, 25, 37.5].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e7e5f0" strokeWidth="0.15" strokeDasharray="0.8 0.8" />)}
        {series.map((s, i) => {
          const x = i * w + (w - bw) / 2;
          const r = Math.min(bw / 2, 1.2);
          const label = `${fmtDay(s.date)}: ${rupiah(s.revenue)} · ${s.orders} pesanan`;
          // Hari tanpa penjualan: penanda tipis saja agar grafik tetap bersih
          if (!s.revenue && !s.orders)
            return <rect key={s.date} x={x} width={bw} y={49.2} height={0.8} rx={0.4} className="fill-[#e3e1ee]"><title>{label}</title></rect>;
          const ordH = 2 + (s.orders / maxOrd) * 12;
          const revH = 2 + (s.revenue / maxRev) * 30;
          return (
            <g key={s.date}>
              <title>{label}</title>
              <rect x={x} width={bw} y={50 - ordH} height={ordH} rx={r} className="fill-leaf-400" />
              <rect x={x} width={bw} y={50 - ordH - 1 - revH} height={revH} rx={r} className="fill-brand-400" />
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex justify-between text-[11px] font-medium text-muted">
        <span>{series[0] ? fmtDay(series[0].date) : ""}</span>
        <span>Puncak harian: Rp{shortNumber(maxRev)}</span>
        <span>{series.length ? fmtDay(series[series.length - 1].date) : ""}</span>
      </figcaption>
    </figure>
  );
}

/** Kartu angka ringkas ala dasbor: ikon bulat, label kecil kapital, angka besar. */
export function Stat({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-line/70 bg-white p-4 shadow-soft">
      {icon && <span className="mb-3 grid size-9 place-items-center rounded-full bg-canvas text-brand-700">{icon}</span>}
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 truncate text-[22px] font-bold tracking-tight sm:text-2xl">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
