import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Address, Cart } from "@/lib/types";
import { ButtonLink, EmptyState } from "@/components/ui";
import { IconCart } from "@/components/icons";
import { CheckoutFlow } from "./checkout-flow";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  await requireMe("/checkout");
  const [cart, addresses] = await Promise.all([api<Cart>("/cart"), api<Address[]>("/addresses")]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Checkout</h1>
      {cart.count === 0 ? (
        <EmptyState icon={<IconCart size={28} />} title="Belum ada yang bisa di-checkout" text="Tambahkan produk ke keranjang terlebih dahulu." action={<ButtonLink href="/">Mulai belanja</ButtonLink>} />
      ) : (
        <CheckoutFlow addresses={addresses} />
      )}
    </div>
  );
}
