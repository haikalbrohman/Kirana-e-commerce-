"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { call, ClientApiError } from "@/lib/client";
import { useToast } from "../toast";
import { Button } from "../ui";

export function ProductStatusActions({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const run = async (action: "publish" | "unpublish" | "archive", msg: string) => {
    if (action === "archive" && !confirm("Arsipkan produk ini? Produk tidak akan tampil lagi.")) return;
    setBusy(true);
    try {
      await call(`/seller/products/${id}/${action}`, { method: "POST" });
      toast({ tone: "success", title: msg });
      router.refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof ClientApiError ? e.message : "Gagal" });
    } finally {
      setBusy(false);
    }
  };
  if (status === "REJECTED") return null;
  return (
    <div className="flex gap-1">
      {status === "ACTIVE" ? (
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => run("unpublish", "Produk disembunyikan")}>Sembunyikan</Button>
      ) : (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => run("publish", "Produk ditampilkan")}>Tampilkan</Button>
      )}
      <Button size="sm" variant="ghost" className="text-rose-600" disabled={busy} onClick={() => run("archive", "Produk diarsipkan")}>Arsipkan</Button>
    </div>
  );
}
