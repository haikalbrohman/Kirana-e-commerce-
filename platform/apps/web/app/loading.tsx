import { ProductGridSkeleton } from "@/components/product-card";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6" aria-busy="true" aria-label="Memuat">
      <div className="skeleton mb-6 h-8 w-48" />
      <ProductGridSkeleton />
    </div>
  );
}
