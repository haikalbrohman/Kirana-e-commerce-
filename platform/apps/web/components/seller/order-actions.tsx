"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { call, ClientApiError } from "@/lib/client";
import { useToast } from "../toast";
import { Button, Input } from "../ui";

export function SellerOrderActions({ id, status, courier }: { id: string; status: string; courier: string }) {
  const [busy, setBusy] = useState(false);
  const [resi, setResi] = useState("");
  const router = useRouter();
  const toast = useToast();
  const run = async (path: string, body?: unknown, msg = "Pesanan diperbarui") => {
    setBusy(true);
    try {
      await call(`/seller/orders/${id}/${path}`, { method: "POST", body });
      toast({ tone: "success", title: msg });
      router.refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof ClientApiError ? e.message : "Gagal" });
    } finally {
      setBusy(false);
    }
  };
  if (status === "PAID") return <Button size="sm" disabled={busy} onClick={() => run("process", undefined, "Pesanan diproses")}>Proses pesanan</Button>;
  if (status === "PROCESSING")
    return (
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run("ship", { trackingNumber: resi.trim(), courier }, "Pesanan dikirim"); }}>
        <Input className="!h-9 w-44 text-sm" placeholder={`No. resi ${courier}`} value={resi} onChange={(e) => setResi(e.target.value)} required minLength={5} maxLength={40} />
        <Button size="sm" disabled={busy || resi.trim().length < 5}>Kirim</Button>
      </form>
    );
  if (status === "SHIPPED") return <Button size="sm" variant="outline" disabled={busy} onClick={() => run("deliver", undefined, "Ditandai sudah sampai")}>Tandai sudah sampai</Button>;
  return null;
}
