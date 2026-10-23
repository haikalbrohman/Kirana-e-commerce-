import Link from "next/link";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { requireRole } from "@/lib/session";
import { Badge, ButtonLink, Card, cx, EmptyState, ProductImage } from "@/components/ui";
import { ProductStatusActions } from "@/components/seller/product-actions";
import { IconPlus, IconStore } from "@/components/icons";

export const metadata = { title: "Produk saya" };

type Row = { id: string; name: string; status: string; minPrice: number; totalStock: number; soldCount: number; moderationNote: string | null; images: { url: string }[]; category: { name: string }; _count: { variants: number } };
const STATUS: Record<string, [string, "brand" | "gray" | "red" | "amber"]> = { ACTIVE: ["Tampil", "brand"], DRAFT: ["Draf", "gray"], REJECTED: ["Diturunkan admin", "red"], ARCHIVED: ["Diarsipkan", "gray"] };
const TABS = [["", "Semua"], ["ACTIVE", "Tampil"], ["DRAFT", "Draf"], ["REJECTED", "Diturunkan"], ["ARCHIVED", "Arsip"]];

export default async function SellerProducts(props: PageProps<"/seller/products">) {
  await requireRole("SELLER", "/seller/products");
  const { status = "" } = (await props.searchParams) as { status?: string };
  const rows = await api<Row[]>(`/seller/products${status ? `?status=${status}` : ""}`);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Produk</h1>
        <ButtonLink href="/seller/products/new"><IconPlus size={18} /> Tambah</ButtonLink>
      </div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
        {TABS.map(([v, l]) => (
          <Link key={v} href={v ? `/seller/products?status=${v}` : "/seller/products"} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", status === v ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white")}>{l}</Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<IconStore size={28} />} title="Belum ada produk" text="Tambahkan produk pertamamu. Foto bisa langsung dari kamera HP." action={<ButtonLink href="/seller/products/new">Tambah produk</ButtonLink>} />
      ) : (
        <Card className="divide-y divide-line">
          {rows.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <Link href={`/seller/products/${p.id}`} className="w-14 shrink-0 overflow-hidden rounded-xl"><ProductImage src={p.images[0]?.url ?? null} alt={p.name} /></Link>
              <div className="min-w-0 flex-1">
                <Link href={`/seller/products/${p.id}`} className="line-clamp-1 font-semibold hover:text-brand-700">{p.name}</Link>
                <p className="text-xs text-muted">{p.category.name} · {p._count.variants} varian · {rupiah(p.minPrice)} · stok {p.totalStock} · {p.soldCount} terjual</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone={STATUS[p.status]?.[1]}>{STATUS[p.status]?.[0]}</Badge>
                  {p.totalStock === 0 && p.status === "ACTIVE" && <Badge tone="amber">Stok habis</Badge>}
                </div>
                {p.moderationNote && <p className="mt-1 text-xs text-rose-700">Catatan admin: {p.moderationNote}</p>}
              </div>
              <ProductStatusActions id={p.id} status={p.status} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
