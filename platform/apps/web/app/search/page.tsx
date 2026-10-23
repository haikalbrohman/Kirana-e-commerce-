import type { Metadata } from "next";
import { SearchView } from "@/components/search-view";

export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const { q } = (await props.searchParams) as Record<string, string | undefined>;
  return { title: q ? `Cari “${q}”` : "Katalog" };
}

export default async function SearchPage(props: PageProps<"/search">) {
  const params = (await props.searchParams) as Record<string, string | undefined>;
  return <SearchView params={params} />;
}
