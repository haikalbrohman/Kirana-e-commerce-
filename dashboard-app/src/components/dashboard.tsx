import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({ icon: Icon, label, value, delta }: { icon: LucideIcon; label: string; value: string; delta?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="size-5" /></span>
        {delta && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">{delta}</span>}
      </div>
      <p className="mt-3 truncate text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  // Perbaikan: minimal 1 agar tidak membagi dengan nol saat semua nilai 0
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((d, i) => (
        // Perbaikan: kolom setinggi grafik (h-full) agar tinggi batang dalam % benar-benar terpakai
        <div key={`${d.label}-${i}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className={cn("w-full rounded-t-lg", i === data.length - 1 ? "bg-primary" : "bg-primary/25")}
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
              title={`${d.label}: ${d.value.toLocaleString("id-ID")}`}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function StatusPill({ s }: { s: string }) {
  const tone = s === "Selesai" || s === "Aktif" || s === "Disetujui" ? "bg-primary-soft text-primary"
    : s === "Menunggu" || s === "Ditinjau" || s === "Diproses" || s === "Menipis" ? "bg-gold/25 text-foreground"
    : s === "Dikirim" ? "bg-accent text-accent-foreground" : "bg-sale/15 text-sale";
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", tone)}>{s}</span>;
}
