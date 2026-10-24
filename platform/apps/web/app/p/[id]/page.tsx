import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, apiOrNull } from "@/lib/api";
import { dateID, rupiah, shortNumber } from "@/lib/format";
import { getMe } from "@/lib/session";
import type { ProductCard, ProductDetail } from "@/lib/types";
import { BuyPanel, Gallery } from "@/components/product-buy";
import { ProductRail } from "@/components/product-card";
import { AssistantButton } from "@/components/assistant";
import { Badge, Card, SectionHeader, Stars } from "@/components/ui";
import { IconChevronRight, IconShield, IconSparkles, IconStar, IconStore, IconTruck } from "@/components/icons";

type Quote = { note: string; options: { id: string; label: string; courier: string; service: string; cost: number; eta: string }[] };

export async function generateMetadata(props: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const p = await apiOrNull<ProductDetail>(`/products/${id}`, { anonymous: true }).catch(() => null);
  return p ? { title: p.name, description: p.description.slice(0, 160) } : { title: "Produk tidak ditemukan" };
}

export default async function ProductPage(props: PageProps<"/p/[id]">) {
  const { id } = await props.params;
  const [product, me] = await Promise.all([apiOrNull<ProductDetail>(`/products/${id}`, { anonymous: true }), getMe()]);
  if (!product) notFound();
  const maxWeight = Math.max(...product.variants.map((v) => v.weightGram));
  const [similar, quote] = await Promise.all([
    api<ProductCard[]>(`/products/${id}/similar`, { anonymous: true }).catch(() => []),
    api<Quote>(`/shipping/quote?weightGram=${maxWeight}`, { anonymous: true }).catch(() => null),
  ]);
  const attrs = Object.entries(product.attributes ?? {});
  const totalReviews = Object.values(product.ratingBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-4 sm:pb-10">
      <div className="grid gap-x-10 gap-y-5 lg:grid-cols-2">
        {/* Judul besar ala katalog premium (di HP tampil di atas foto) */}
        <div className="min-w-0 lg:col-start-2">
          <p className="text-sm font-semibold text-brand-700">{product.store.name}</p>
          <h1 className="mt-1 text-[32px] font-light leading-[1.05] tracking-tight sm:text-[44px]">{product.name}</h1>
          <nav className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-brand-700">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/c/${product.category.slug}`} className="hover:text-brand-700">{product.category.name}</Link>
          </nav>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {product.ratingCount > 0 ? (
              <a href="#ulasan" className="flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-line">
                <IconStar size={15} className="fill-amber-400 text-amber-400" />
                <span className="font-bold">{product.ratingAvg.toFixed(1)}</span>
                <span className="text-muted">({product.ratingCount} ulasan)</span>
              </a>
            ) : (
              <span className="rounded-full bg-white px-3 py-1 text-muted ring-1 ring-line">Belum ada ulasan</span>
            )}
            <span className="rounded-full bg-white px-3 py-1 text-muted ring-1 ring-line">{shortNumber(product.soldCount)} terjual</span>
          </div>
        </div>

        <div className="min-w-0 lg:sticky lg:top-24 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
          <Gallery images={product.images} name={product.name} icon={product.category.icon} />
        </div>

        <div className="min-w-0 space-y-5 lg:col-start-2">
          <Card className="p-5">
            <BuyPanel product={product} loggedIn={!!me} />
          </Card>

          {/* Penjual */}
          <Card className="flex items-center gap-4 p-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-aurora text-lg font-black text-white">{product.store.name[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-bold">
                {product.store.name} {product.store.isUmkm && <Badge tone="brand">UMKM</Badge>}
              </p>
              <p className="text-xs text-muted">{product.store.city} · {product.store.activeProducts} produk · bergabung {dateID(product.store.createdAt)}</p>
            </div>
            <Link href={`/store/${product.store.slug}`} className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-100">
              <IconStore size={16} /> Kunjungi
            </Link>
          </Card>

          {/* Pengiriman */}
          {quote && (
            <Card className="p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold"><IconTruck size={18} className="text-brand-600" /> Perkiraan pengiriman dari {product.store.city ?? "penjual"}</p>
              <ul className="space-y-1.5 text-sm">
                {quote.options.map((o) => (
                  <li key={o.id} className="flex justify-between gap-3">
                    <span>{o.label} <span className="text-muted">({o.courier} · {o.eta})</span></span>
                    <span className="font-semibold">{rupiah(o.cost)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">{quote.note}</p>
            </Card>
          )}

          <div className="flex items-center gap-3 rounded-3xl bg-brand-50 p-4 text-sm text-brand-900">
            <IconShield className="shrink-0 text-brand-600" />
            <p>Dana diteruskan ke penjual setelah pesanan selesai. Pembayaran diproses aman oleh Midtrans.</p>
          </div>

          {/* Spesifikasi & deskripsi */}
          <Card className="p-5">
            {attrs.length > 0 && (
              <>
                <h2 className="mb-3 font-bold">Spesifikasi</h2>
                <dl className="mb-5 space-y-1 text-sm">
                  {attrs.map(([k, v], i) => (
                    <div key={k} className={`grid grid-cols-[40%_1fr] gap-3 rounded-full px-4 py-2 ${i % 2 ? "" : "bg-canvas"}`}>
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            <h2 className="mb-2 font-bold">Deskripsi</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{product.description}</p>
          </Card>

          <AssistantButton prompt={`Apakah ${product.name} cocok untuk saya? Bandingkan dengan alternatif lain.`} className="flex w-full items-center gap-3 rounded-3xl border border-leaf-200 bg-leaf-50 p-4 text-left transition hover:bg-leaf-100">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-leafy text-white shadow-md shadow-leaf-500/30"><IconSparkles size={18} /></span>
            <span className="flex-1">
              <span className="block text-sm font-bold">Tanya Shopia AI tentang produk ini</span>
              <span className="text-xs text-muted">Cocok untuk kebutuhanmu? Ada alternatif lebih hemat?</span>
            </span>
            <IconChevronRight size={18} className="text-muted" />
          </AssistantButton>

          {/* Ulasan */}
          <Card className="p-5" id="ulasan">
            <h2 className="mb-4 font-bold">Ulasan pembeli</h2>
            {totalReviews === 0 ? (
              <p className="text-sm text-muted">Belum ada ulasan. Ulasan hanya bisa ditulis pembeli yang sudah menerima barang.</p>
            ) : (
              <>
                <div className="mb-5 flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold">{product.ratingAvg.toFixed(1)}</p>
                    <Stars value={product.ratingAvg} />
                    <p className="mt-1 text-xs text-muted">{product.ratingCount} ulasan</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const c = product.ratingBreakdown[n] ?? 0;
                      return (
                        <div key={n} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-muted">{n}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-lime-400" style={{ width: `${(c / totalReviews) * 100}%` }} />
                          </div>
                          <span className="w-5 text-right text-muted">{c}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <ul className="divide-y divide-line">
                  {product.reviews.map((r) => (
                    <li key={r.id} className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{r.author}</span>
                        <span className="text-xs text-muted">{dateID(r.createdAt)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Stars value={r.rating} size={13} />
                        <span className="text-xs text-muted">Varian: {r.variantName}</span>
                        <Badge tone="brand">Pembeli terverifikasi</Badge>
                      </div>
                      {r.comment && <p className="mt-1.5 text-sm text-slate-700">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <SectionHeader icon={<IconSparkles className="text-leaf-500" />} title="Produk serupa" subtitle="Kategori, kata kunci, dan kisaran harga yang mirip" />
          <ProductRail items={similar} />
        </section>
      )}
    </div>
  );
}
