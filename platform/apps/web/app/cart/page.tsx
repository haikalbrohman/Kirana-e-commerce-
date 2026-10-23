import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Cart } from "@/lib/types";
import { CartView } from "./cart-view";

export const metadata = { title: "Keranjang" };

export default async function CartPage() {
  await requireMe("/cart");
  const cart = await api<Cart>("/cart");
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Keranjang</h1>
      <CartView initial={cart} />
    </div>
  );
}
