export const rupiah = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

export const shortNumber = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1).replace(".0", "").replace(".", ",") + "jt" : n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "").replace(".", ",") + "rb" : String(n);

export const dateID = (d: string | Date, withTime = false) =>
  new Date(d).toLocaleString("id-ID", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });

export const ORDER_STATUS: Record<string, { label: string; tone: "gray" | "amber" | "brand" | "blue" | "red" }> = {
  PENDING_PAYMENT: { label: "Menunggu pembayaran", tone: "amber" },
  PAID: { label: "Dibayar", tone: "blue" },
  PROCESSING: { label: "Diproses", tone: "blue" },
  SHIPPED: { label: "Dikirim", tone: "blue" },
  DELIVERED: { label: "Sampai", tone: "brand" },
  COMPLETED: { label: "Selesai", tone: "brand" },
  CANCELLED: { label: "Dibatalkan", tone: "red" },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: "gray" | "amber" | "brand" | "blue" | "red" }> = {
  PENDING: { label: "Menunggu pembayaran", tone: "amber" },
  PAID: { label: "Lunas", tone: "brand" },
  FAILED: { label: "Gagal / dibatalkan", tone: "red" },
  EXPIRED: { label: "Kedaluwarsa", tone: "red" },
  REFUNDED: { label: "Dikembalikan", tone: "gray" },
};
