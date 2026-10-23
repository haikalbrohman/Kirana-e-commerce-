import Link from "next/link";
import { Suspense } from "react";
import { api } from "@/lib/api";
import type { AiSearchResult, Category, SearchResult } from "@/lib/types";
import { ProductGrid } from "./product-card";
import { Filters, SortSelect } from "./filters";
import { AssistantButton } from "./assistant";
import { ButtonLink, EmptyState, ErrorBox } from "./ui";
import { IconSearch, IconSparkles } from "./icons";

type Params = Record<string, string | undefined>;

/** Halaman hasil: pencarian bahasa alami (AI) atau katalog dengan filter. */
export async function SearchView({ params, category }: { params: Params; category?: Category }) {
  const q = params.q?.trim();
  const manual = ["category", "minPrice", "maxPrice", "minRating", "sort"].some((k) => params[k]);
  const page = Math.max(1, Number(params.page) || 1);
  let result: (SearchResult & Partial<Pick<AiSearchResult, "understood" | "source">>) | null = null;
  let categories: Category[] = [];
  try {
    categories = await api<Category[]>("/categories", { anonymous: true });
    if (q && !manual && !category) {
      result = await api<AiSearchResult>(`/ai/search?${new URLSearchParams({ q, page: String(page) })}`);
    } else {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      for (const k of ["minPrice", "maxPrice", "minRating", "sort"]) if (params[k]) sp.set(k, params[k]!);
      const cat = category?.slug ?? params.category;
      if (cat) sp.set("category", cat);
      sp.set("page", String(page));
      result = await api<SearchResult>(`/products?${sp}`, { anonymous: true });
    }
  } catch {
    result = null;
  }

  const title = category ? `${category.icon ?? ""} ${category.name}` : q ? `Hasil untuk “${q}”` : "Semua produk";
  const nextPage = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
  nextPage.set("page", String(page + 1));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
      {result?.understood && result.understood.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/70 p-3 text-sm animate-fade-in">
          <span className="inline-flex items-center gap-1 font-semibold text-brand-800">
            <IconSparkles size={16} /> {result.source === "ai" ? "Shopia AI memahami:" : "Dipahami sebagai:"}
          </span>
          {result.understood.map((u) => (
            <span key={u} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-900 ring-1 ring-brand-100">{u}</span>
          ))}
        </div>
      )}
      {result?.relaxed && result.total > 0 && (
        <p className="mt-3 text-sm text-amber-800">Tidak ada yang cocok persis, jadi kami tampilkan produk yang paling mendekati.</p>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr]">
        <Suspense>
          <Filters categories={categories} fixedCategory={category?.slug} />
        </Suspense>
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">{result ? `${result.total} produk` : ""}</p>
            <Suspense>
              <SortSelect />
            </Suspense>
          </div>
          {!result ? (
            <ErrorBox text="Produk belum bisa dimuat. Coba muat ulang halaman." />
          ) : result.items.length === 0 ? (
            <EmptyState
              icon={<IconSearch size={28} />}
              title="Produk tidak ditemukan"
              text="Coba kata lain, longgarkan filter, atau ceritakan kebutuhanmu ke Shopia AI."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <AssistantButton prompt={q} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
                    <IconSparkles size={16} /> Tanya Shopia AI
                  </AssistantButton>
                  <ButtonLink href="/search" variant="outline">Lihat semua produk</ButtonLink>
                </div>
              }
            />
          ) : (
            <>
              <ProductGrid items={result.items} className="lg:!grid-cols-3 xl:!grid-cols-4" />
              {result.page * result.limit < result.total && (
                <div className="mt-8 text-center">
                  <Link href={`?${nextPage}`} scroll={false} className="inline-flex h-11 items-center rounded-xl border border-line bg-white px-6 text-sm font-semibold hover:border-brand-300">
                    Halaman berikutnya
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
