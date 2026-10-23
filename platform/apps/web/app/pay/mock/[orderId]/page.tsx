import { notFound } from "next/navigation";
import { requireMe } from "@/lib/session";
import { MockPay } from "./mock-pay";

export const metadata = { title: "Simulator pembayaran", robots: { index: false } };

export default async function MockPayPage(props: PageProps<"/pay/mock/[orderId]">) {
  if (process.env.NODE_ENV === "production" && process.env.SHOPIA_ALLOW_MOCK_PAY !== "true") notFound();
  const { orderId } = await props.params;
  await requireMe(`/pay/mock/${orderId}`);
  return (
    <div className="px-4 py-10">
      <MockPay orderId={orderId} />
    </div>
  );
}
