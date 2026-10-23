import { notFound } from "next/navigation";
import { api, apiOrNull } from "@/lib/api";
import { dateID, shortNumber } from "@/lib/format";
import type { SearchResult } from "@/lib/types";
import { ProductGrid } from "@/components/product-card";
import { Badge, EmptyState } from "@/components/ui";
import { IconMapPin, IconPackage } from "@/components/icons";

type Store = { name: string; slug: string; description: string | null; city: string | null; isUmkm: boolean; createdAt: string; productCount: number; totalSold: number };

export async function generateMetadata(props: PageProps<"/store/[slug]">) {
  const { slug } = await props.params;
  const s = await apiOrNull<Store>(`/stores/${slug}`, { anonymous: true }).catch(() => null);
  return { title: s?.name ?? "Toko" };
}

export default async function StorePage(props: PageProps<"/store/[slug]">) {
  const { slug } = await props.params;
  const store = await apiOrNull<Store>(`/stores/${slug}`, { anonymous: true });
  if (!store) notFound();
  const products = await api<SearchResult>(`/products?store=${encodeURIComponent(slug)}&sort=popular&limit=60`, { anonymous: true });
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="overflow-hidden rounded-3xl border border-line bg-white">
        <div className="h-24 bg-gradient-to-r from-brand-700 to-emerald-400 sm:h-32" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <span className="-mt-14 grid size-20 place-items-center rounded-2xl border-4 border-white bg-brand-50 text-3xl font-black text-brand-700 shadow-soft">{store.name[0]}</span>
          <div className="flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
              {store.name} {store.isUmkm && <Badge tone="brand">UMKM</Badge>}
            </h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted"><IconMapPin size={14} /> {store.city ?? "Indonesia"} · bergabung {dateID(store.createdAt)}</p>
            {store.description && <p className="mt-2 max-w-2xl text-sm text-slate-700">{store.description}</p>}
          </div>
          <div className="flex gap-6 text-center">
            <div><p className="text-xl font-extrabold">{store.productCount}</p><p className="text-xs text-muted">Produk</p></div>
            <div><p className="text-xl font-extrabold">{shortNumber(store.totalSold)}</p><p className="text-xs text-muted">Terjual</p></div>
          </div>
        </div>
      </div>
      <div className="mt-8">
        {products.items.length ? <ProductGrid items={products.items} /> : <EmptyState icon={<IconPackage size={28} />} title="Belum ada produk" text="Toko ini belum menampilkan produk." />}
      </div>
    </div>
  );
}
