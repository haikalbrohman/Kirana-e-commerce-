import Link from "next/link";
import { api } from "@/lib/api";
import { rupiah, shortNumber } from "@/lib/format";
import type { Category, ProductCard } from "@/lib/types";
import { ProductGrid, ProductRail } from "@/components/product-card";
import { AssistantButton } from "@/components/assistant";
import { ErrorBox, SectionHeader } from "@/components/ui";
import { IconArrowRight, IconCheck, IconShield, IconSparkles, IconStore, IconTruck } from "@/components/icons";

type Home = {
  categories: Category[];
  popular: ProductCard[];
  newest: ProductCard[];
  deals: ProductCard[];
  stores: { name: string; slug: string; city: string | null; description: string | null; productCount: number; totalSold: number }[];
};
type Recs = { personalized: boolean; reason: string; items: ProductCard[] };
type Voucher = { code: string; description: string; type: string; value: number; minSpend: number; maxDiscount: number | null; endsAt: string | null };

const PROMPTS = ["Hadiah ulang tahun untuk ibu", "Sepatu lari di bawah 500 ribu", "Laptop untuk kuliah budget 7 juta"];

export default async function HomePage() {
  let home: Home | null = null;
  let recs: Recs | null = null;
  let vouchers: Voucher[] = [];
  try {
    [home, recs, vouchers] = await Promise.all([api<Home>("/home", { anonymous: true }), api<Recs>("/recommendations"), api<Voucher[]>("/vouchers", { anonymous: true })]);
  } catch {
    home = null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Hero */}
      <section className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 px-5 py-6 text-white sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 size-64 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 animate-slide-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <IconSparkles size={14} /> Asisten belanja AI
            </span>
            <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight sm:mt-4 sm:text-5xl">Belanja Lebih Cerdas dengan AI.</h1>
            <p className="mt-2 max-w-lg text-sm text-brand-50/90 sm:mt-3 sm:text-lg">Ceritakan kebutuhan dan budget-mu. Shopia AI mencarikan dari produk UMKM & toko pilihan yang benar-benar tersedia.</p>
            <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
              {PROMPTS.map((p) => (
                <AssistantButton key={p} prompt={p} className="shrink-0 rounded-full bg-white/15 px-3.5 py-2 text-[13px] font-medium backdrop-blur transition hover:bg-white/25 sm:text-sm">
                  “{p}”
                </AssistantButton>
              ))}
            </div>
            <div className="mt-5 flex gap-2 sm:mt-6 sm:gap-3">
              <AssistantButton className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-brand-800 shadow-lg transition hover:bg-brand-50 sm:h-12 sm:px-5 sm:text-base">
                <IconSparkles size={18} /> Tanya Shopia AI
              </AssistantButton>
              <Link href="/search" className="inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white ring-1 ring-white/40 hover:bg-white/10 sm:h-12 sm:text-base">
                Katalog <IconArrowRight size={18} />
              </Link>
            </div>
          </div>
          {/* Pratinjau percakapan (ilustrasi cara kerja, desktop) */}
          <div aria-hidden="true" className="hidden rounded-3xl bg-white/95 p-4 text-ink shadow-2xl animate-slide-up [animation-delay:150ms] lg:block">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white"><IconSparkles size={16} /></span>
              <p className="text-sm font-bold">Shopia AI</p>
              <span className="ml-auto text-[11px] text-muted">contoh percakapan</span>
            </div>
            <div className="space-y-2.5 pt-3 text-[13px]">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-3 py-2 text-white">Carikan tas kerja hitam muat laptop 14 inci, di bawah 400 ribu</p>
              <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-canvas px-3 py-2">Ada yang pas: tas kulit sintetis dengan slot laptop berbusa hingga 14 inci, tampilannya profesional. Mau yang pakai tali selempang?</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Harga & stok asli dari katalog", "Alasan rekomendasi", "Kamu yang memutuskan"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-800">
                    <IconCheck size={12} /> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Keunggulan */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-medium text-muted sm:gap-3 sm:text-sm">
        {[
          [<IconShield key="s" size={18} />, "Pembayaran aman"],
          [<IconTruck key="t" size={18} />, "Lacak pengiriman"],
          [<IconStore key="u" size={18} />, "Dukung UMKM"],
        ].map(([icon, text], i) => (
          <div key={i} className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-white px-2 py-3 sm:flex-row sm:justify-center sm:gap-2">
            <span className="text-brand-600">{icon}</span>
            {text}
          </div>
        ))}
      </div>

      {!home ? (
        <div className="mt-8">
          <ErrorBox title="Katalog belum bisa dimuat" text="Server Shopia sedang tidak dapat dihubungi. Coba muat ulang halaman beberapa saat lagi." />
        </div>
      ) : (
        <>
          {/* Voucher aktif */}
          {vouchers.length > 0 && (
            <section className="mt-8" aria-label="Voucher">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {vouchers.map((v) => (
                  <div key={v.code} className="flex min-w-[260px] items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-sm font-black text-white">
                      {v.type === "PERCENT" ? `${v.value}%` : v.type === "FREE_SHIPPING" ? "🚚" : "Rp"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold tracking-wide text-brand-800">{v.code}</p>
                      <p className="text-xs text-brand-900/80">{v.description}</p>
                      {v.minSpend > 0 && <p className="text-[11px] text-muted">Min. belanja {rupiah(v.minSpend)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Kategori */}
          <section className="mt-8">
            <SectionHeader title="Kategori" href="/search" />
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
              {home.categories.map((c) => (
                <Link key={c.id} href={`/c/${c.slug}`} className="group flex flex-col items-center gap-2 rounded-2xl border border-line bg-white p-3 text-center transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-2xl transition group-hover:scale-110">{c.icon}</span>
                  <span className="text-[11px] font-semibold leading-tight sm:text-xs">{c.name}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Rekomendasi (jujur: personal hanya jika datanya cukup) */}
          {recs && recs.items.length > 0 && (
            <section className="mt-10">
              <SectionHeader icon={<IconSparkles className="text-brand-600" />} title={recs.personalized ? "Rekomendasi untukmu" : "Pilihan populer"} subtitle={recs.reason} />
              <ProductGrid items={recs.items.slice(0, 10)} />
            </section>
          )}

          {home.deals.length > 0 && (
            <section className="mt-10">
              <SectionHeader title="Penawaran hemat" subtitle="Diskon dari harga normal yang tercatat penjual" href="/search?sort=price_asc" />
              <ProductRail items={home.deals} />
            </section>
          )}

          <section className="mt-10">
            <SectionHeader title="Produk terlaris" href="/search?sort=popular" />
            <ProductGrid items={home.popular} />
          </section>

          {/* Toko UMKM pilihan */}
          {home.stores.length > 0 && (
            <section className="mt-10">
              <SectionHeader title="Toko UMKM pilihan" subtitle="Produk lokal dari pengrajin & usaha kecil Indonesia" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {home.stores.map((s) => (
                  <Link key={s.slug} href={`/store/${s.slug}`} className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-brand-200 hover:shadow-soft">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 text-xl font-black text-brand-700">{s.name[0]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold group-hover:text-brand-700">{s.name}</p>
                      <p className="truncate text-xs text-muted">{s.city} · {s.productCount} produk · {shortNumber(s.totalSold)} terjual</p>
                      {s.description && <p className="mt-1 line-clamp-1 text-xs text-muted">{s.description}</p>}
                    </div>
                    <IconArrowRight size={18} className="text-muted group-hover:text-brand-700" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <SectionHeader title="Baru di Shopia" href="/search?sort=newest" />
            <ProductGrid items={home.newest} />
          </section>
        </>
      )}
    </div>
  );
}
