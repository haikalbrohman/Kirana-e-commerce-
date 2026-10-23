import { notFound } from "next/navigation";
import { apiOrNull } from "@/lib/api";
import { requireMe } from "@/lib/session";
import { PaymentStatus } from "./payment-status";

export const metadata = { title: "Status pembayaran" };

export default async function PaymentPage(props: PageProps<"/payments/[id]">) {
  const { id } = await props.params;
  await requireMe(`/payments/${id}`);
  const payment = await apiOrNull<Parameters<typeof PaymentStatus>[0]["initial"]>(`/payments/${id}`);
  if (!payment) notFound();
  return (
    <div className="px-4 py-10">
      <PaymentStatus initial={payment} />
    </div>
  );
}
