"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { call, ClientApiError } from "@/lib/client";
import { useToast } from "./toast";
import { Button } from "./ui";

/** Tombol aksi admin. Jika needsReason, admin wajib menulis alasan (tercatat di audit log). */
export function AdminAction({ path, label, method = "POST", body, needsReason, confirmText, variant = "outline" }: { path: string; label: string; method?: string; body?: Record<string, unknown>; needsReason?: boolean; confirmText?: string; variant?: "outline" | "danger" | "secondary" | "primary" }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={busy}
      onClick={async () => {
        let payload = body;
        if (needsReason) {
          const reason = prompt(`${label}: tulis alasan (minimal 5 karakter, tercatat di audit log)`);
          if (!reason || reason.trim().length < 5) return;
          payload = { ...body, reason: reason.trim() };
        } else if (confirmText && !confirm(confirmText)) return;
        setBusy(true);
        try {
          await call(path, { method, body: payload ?? {} });
          toast({ tone: "success", title: `${label} berhasil` });
          router.refresh();
        } catch (e) {
          toast({ tone: "error", title: e instanceof ClientApiError ? e.message : "Gagal" });
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </Button>
  );
}
