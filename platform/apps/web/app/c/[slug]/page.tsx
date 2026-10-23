import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { SearchView } from "@/components/search-view";

async function getCategory(slug: string) {
  const all = await api<Category[]>("/categories", { anonymous: true });
  return all.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata(props: PageProps<"/c/[slug]">) {
  const { slug } = await props.params;
  const c = await getCategory(slug).catch(() => null);
  return { title: c?.name ?? "Kategori" };
}

export default async function CategoryPage(props: PageProps<"/c/[slug]">) {
  const { slug } = await props.params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const params = (await props.searchParams) as Record<string, string | undefined>;
  return <SearchView params={params} category={category} />;
}
