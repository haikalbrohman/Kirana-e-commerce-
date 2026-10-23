import Link from "next/link";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { AdminAction } from "@/components/admin-action";
import { StatusTabs } from "@/components/admin-tabs";
import { Badge, Card, EmptyState, ProductImage } from "@/components/ui";
import { IconShield } from "@/components/icons";

export const metadata = { title: "Admin · Moderasi produk" };
type Row = { id: string; name: string; status: string; minPrice: number; moderationNote: string | null; store: { name: string; slug: string }; images: { url: string }[]; category: { name: string } };

export default async function AdminProducts(props: PageProps<"/admin/products">) {
  const { status = "", q = "" } = (await props.searchParams) as { status?: string; q?: string };
  const sp = new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}) });
  const rows = await api<Row[]>(`/admin/products?${sp}`);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Moderasi produk</h1>
      <form className="mb-3"><input name="q" defaultValue={q} placeholder="Cari nama produk…" className="h-10 w-full rounded-xl border border-line px-3 text-sm" />{status && <input type="hidden" name="status" value={status} />}</form>
      <StatusTabs base="/admin/products" current={status} tabs={[["", "Semua"], ["ACTIVE", "Tampil"], ["REJECTED", "Diturunkan"], ["DRAFT", "Draf"]]} />
      {rows.length === 0 ? <EmptyState icon={<IconShield size={28} />} title="Tidak ada produk" /> : (
        <Card className="divide-y divide-line">
          {rows.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="w-12 shrink-0 overflow-hidden rounded-lg"><ProductImage src={p.images[0]?.url ?? null} alt={p.name} /></div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-semibold">{p.status === "ACTIVE" ? <Link href={`/p/${p.id}`} className="hover:text-brand-700">{p.name}</Link> : p.name}</p>
                <p className="text-xs text-muted">{p.store.name} · {p.category.name} · {rupiah(p.minPrice)} <Badge tone={p.status === "ACTIVE" ? "brand" : p.status === "REJECTED" ? "red" : "gray"}>{p.status}</Badge></p>
                {p.moderationNote && <p className="text-xs text-rose-700">Alasan: {p.moderationNote}</p>}
              </div>
              {p.status === "REJECTED" ? <AdminAction path={`/admin/products/${p.id}/restore`} label="Pulihkan" confirmText="Tampilkan kembali produk ini?" /> : <AdminAction path={`/admin/products/${p.id}/takedown`} label="Turunkan" variant="danger" needsReason />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
