import { api } from "@/lib/api";
import { requireRole } from "@/lib/session";
import type { Category } from "@/lib/types";
import { ProductForm } from "@/components/seller/product-form";

export const metadata = { title: "Tambah produk" };

export default async function NewProductPage() {
  await requireRole("SELLER", "/seller/products/new");
  const categories = await api<Category[]>("/categories", { anonymous: true });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Tambah produk</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
