import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { ProductCard } from "@/lib/types";
import { Badge, ButtonLink, Card, EmptyState, ErrorBox, Price, ProductImage } from "@/components/ui";
import { IconCompare, IconSparkles } from "@/components/icons";

export const metadata = { title: "Bandingkan produk" };

type Compare = {
  products: ProductCard[];
  table: { label: string; values: (string | null)[] }[];
  analysis: { summary: string; verdict: string; items: { id: string; pros: string[]; cons: string[]; bestFor: string }[] };
  source: "ai" | "rules";
};

export default async function ComparePage(props: PageProps<"/compare">) {
  const { ids = "" } = (await props.searchParams) as { ids?: string };
  const list = ids.split(",").filter(Boolean).slice(0, 4);
  if (list.length < 2)
    return <EmptyState icon={<IconCompare size={28} />} title="Pilih minimal 2 produk" text="Tekan ikon bandingkan pada kartu produk, lalu buka halaman ini dari baki perbandingan di bawah layar." action={<ButtonLink href="/search">Pilih produk</ButtonLink>} />;

  let data: Compare | null = null;
  let error: string | null = null;
  try {
    data = await api<Compare>("/ai/compare", { method: "POST", body: JSON.stringify({ productIds: list }) });
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Perbandingan gagal dimuat";
  }
  if (!data) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox text={error ?? ""} /></div>;

  const cols = `minmax(110px,160px) repeat(${data.products.length}, minmax(150px, 1fr))`;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Bandingkan produk</h1>

      <Card className="mt-4 border-brand-100 bg-brand-50/60 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-brand-800">
          <IconSparkles size={18} /> {data.source === "ai" ? "Ringkasan Shopia AI" : "Ringkasan otomatis"}
          <Badge tone="gray">hanya dari data produk</Badge>
        </p>
        <p className="mt-2 text-sm text-slate-800">{data.analysis.summary}</p>
        <p className="mt-2 text-sm font-semibold text-brand-900">{data.analysis.verdict}</p>
      </Card>

      <div className="-mx-4 mt-5 overflow-x-auto px-4">
        <div className="min-w-fit overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid border-b border-line" style={{ gridTemplateColumns: cols }}>
            <div className="p-3" />
            {data.products.map((p) => (
              <Link key={p.id} href={`/p/${p.id}`} className="group border-l border-line p-3">
                <div className="mx-auto w-24 overflow-hidden rounded-xl"><ProductImage src={p.imageUrl} alt={p.name} icon={p.category.icon} /></div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold group-hover:text-brand-700">{p.name}</p>
                <div className="mt-1"><Price price={p.price} compareAt={p.compareAtPrice} size="sm" /></div>
              </Link>
            ))}
          </div>
          {data.table.map((row) => (
            <div key={row.label} className="grid border-b border-line text-sm last:border-0 odd:bg-canvas/60" style={{ gridTemplateColumns: cols }}>
              <div className="p-3 font-semibold text-muted">{row.label}</div>
              {row.values.map((v, i) => (
                <div key={i} className="border-l border-line p-3">{v ?? <span className="italic text-slate-400">Tidak diketahui</span>}</div>
              ))}
            </div>
          ))}
          {data.analysis.items.length > 0 && (
            <div className="grid text-sm" style={{ gridTemplateColumns: cols }}>
              <div className="p-3 font-semibold text-muted">Analisis</div>
              {data.products.map((p) => {
                const a = data!.analysis.items.find((x) => x.id === p.id);
                return (
                  <div key={p.id} className="space-y-2 border-l border-line p-3">
                    {a?.pros.map((x) => <p key={x} className="text-brand-800">＋ {x}</p>)}
                    {a?.cons.map((x) => <p key={x} className="text-rose-700">－ {x}</p>)}
                    {a?.bestFor && <p className="text-xs text-muted">Cocok untuk: {a.bestFor}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">Informasi “Tidak diketahui” berarti penjual belum mencantumkannya. AI tidak menebak data yang tidak tersedia.</p>
    </div>
  );
}
