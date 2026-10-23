"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { call, ClientApiError } from "@/lib/client";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/toast";

/** Simulator pembayaran (mode pengembangan). Mengirim notifikasi bertanda tangan seperti Midtrans. */
export function MockPay({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const run = async (result: "settlement" | "deny" | "expire") => {
    setBusy(true);
    try {
      const p = await call<{ id: string }>(`/payments/mock/${encodeURIComponent(orderId)}/simulate`, { body: { result } });
      router.push(`/payments/${p.id}`);
    } catch (e) {
      toast({ tone: "error", title: e instanceof ClientApiError ? e.message : "Simulasi gagal" });
      setBusy(false);
    }
  };
  return (
    <Card className="mx-auto max-w-md p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Mode uji · bukan pembayaran sungguhan</p>
      <h1 className="mt-1 text-xl font-extrabold">Simulator pembayaran</h1>
      <p className="mt-1 font-mono text-xs text-muted">{orderId}</p>
      <p className="mt-3 text-sm text-slate-700">Halaman ini menggantikan Midtrans saat pengembangan lokal. Pilih hasil pembayaran untuk menguji alur pesanan.</p>
      <div className="mt-5 grid gap-2">
        <Button disabled={busy} onClick={() => run("settlement")}>✅ Bayar berhasil</Button>
        <Button disabled={busy} variant="outline" onClick={() => run("deny")}>❌ Pembayaran ditolak</Button>
        <Button disabled={busy} variant="ghost" onClick={() => run("expire")}>⌛ Kedaluwarsa</Button>
      </div>
    </Card>
  );
}
