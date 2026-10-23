"use client";

import { useState } from "react";
import { call } from "@/lib/client";
import type { Address } from "@/lib/types";
import { AddressForm } from "@/components/address-form";
import { Badge, Button } from "@/components/ui";

export function AddressManager({ initial }: { initial: Address[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  return (
    <div className="space-y-3">
      {list.map((a) =>
        editing !== "new" && editing?.id === a.id ? (
          <AddressForm key={a.id} initial={a} onSaved={(s) => { setList((l) => l.map((x) => (x.id === s.id ? s : s.isDefault ? { ...x, isDefault: false } : x))); setEditing(null); }} onCancel={() => setEditing(null)} />
        ) : (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-line p-3 text-sm">
            <div>
              <p className="font-semibold">{a.label} {a.isDefault && <Badge tone="brand">Utama</Badge>}</p>
              <p className="text-muted">{a.recipientName} · {a.phone}</p>
              <p className="text-muted">{a.line1}, {a.city}, {a.province} {a.postalCode}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>Ubah</Button>
              <Button size="sm" variant="ghost" className="text-rose-600" onClick={async () => { if (!confirm("Hapus alamat ini?")) return; await call(`/addresses/${a.id}`, { method: "DELETE" }); setList((l) => l.filter((x) => x.id !== a.id)); }}>Hapus</Button>
            </div>
          </div>
        ),
      )}
      {editing === "new" ? (
        <AddressForm onSaved={(s) => { setList((l) => [...l.map((x) => (s.isDefault ? { ...x, isDefault: false } : x)), s]); setEditing(null); }} onCancel={() => setEditing(null)} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setEditing("new")}>+ Tambah alamat</Button>
      )}
    </div>
  );
}
