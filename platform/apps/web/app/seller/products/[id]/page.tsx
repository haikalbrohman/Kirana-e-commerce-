import Link from "next/link";
import { notFound } from "next/navigation";
import { api, apiOrNull } from "@/lib/api";
import { requireRole } from "@/lib/session";
import type { Category } from "@/lib/types";
import { ProductForm, type ProductInput } from "@/components/seller/product-form";
import { Badge } from "@/components/ui";

export const metadata = { title: "Ubah produk" };

export default async function EditProductPage(props: PageProps<"/seller/products/[id]">) {
  const { id } = await props.params;
  await requireRole("SELLER", `/seller/products/${id}`);
  const [product, categories] = await Promise.all([apiOrNull<ProductInput & { moderationNote: string | null }>(`/seller/products/${id}`), api<Category[]>("/categories", { anonymous: true })]);
  if (!product) notFound();
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Ubah produk</h1>
        <div className="flex items-center gap-2">
          <Badge tone={product.status === "ACTIVE" ? "brand" : product.status === "REJECTED" ? "red" : "gray"}>{{ ACTIVE: "Tampil", DRAFT: "Draf", REJECTED: "Diturunkan admin", ARCHIVED: "Diarsipkan" }[product.status]}</Badge>
          {product.status === "ACTIVE" && <Link href={`/p/${product.id}`} className="text-sm font-semibold text-brand-700">Lihat di toko →</Link>}
        </div>
      </div>
      {product.moderationNote && <p className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">Diturunkan admin: {product.moderationNote}. Perbaiki lalu hubungi admin untuk peninjauan ulang.</p>}
      <ProductForm categories={categories} initial={product} />
    </div>
  );
}
