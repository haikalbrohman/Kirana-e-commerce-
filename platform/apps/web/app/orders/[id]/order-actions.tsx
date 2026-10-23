"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { call, ClientApiError } from "@/lib/client";
import { Button, cx, Textarea } from "@/components/ui";
import { IconStar } from "@/components/icons";
import { useToast } from "@/components/toast";

export function CompleteOrderButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  return (
    <Button
      block
      disabled={busy}
      onClick={async () => {
        if (!confirm("Pastikan barang sudah kamu terima dengan baik. Setelah dikonfirmasi, dana diteruskan ke penjual.")) return;
        setBusy(true);
        try {
          await call(`/orders/${orderId}/complete`, { method: "POST" });
          toast({ tone: "success", title: "Pesanan selesai. Terima kasih!" });
          router.refresh();
        } catch (e) {
          toast({ tone: "error", title: e instanceof ClientApiError ? e.message : "Gagal" });
        } finally {
          setBusy(false);
        }
      }}
    >
      Pesanan sudah diterima
    </Button>
  );
}

export function ReviewForm({ orderItemId }: { orderItemId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  return (
    <form
      className="mt-2 space-y-2 rounded-xl bg-canvas p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!rating) return toast({ tone: "error", title: "Pilih jumlah bintang" });
        setBusy(true);
        try {
          await call("/reviews", { body: { orderItemId, rating, comment: comment.trim() || undefined } });
          toast({ tone: "success", title: "Ulasan terkirim. Terima kasih!" });
          router.refresh();
        } catch (err) {
          toast({ tone: "error", title: err instanceof ClientApiError ? err.message : "Gagal mengirim ulasan" });
          setBusy(false);
        }
      }}
    >
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} role="radio" aria-checked={rating === n} aria-label={`${n} bintang`}>
            <IconStar size={26} className={cx("transition", n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300")} />
          </button>
        ))}
      </div>
      <Textarea rows={2} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ceritakan pengalamanmu (opsional)" />
      <Button size="sm" disabled={busy}>Kirim ulasan</Button>
    </form>
  );
}
