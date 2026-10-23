"use client";

import { useState } from "react";
import { call, ClientApiError } from "@/lib/client";
import type { Address } from "@/lib/types";
import { Button, Input, Label } from "./ui";

const EMPTY = { label: "Rumah", recipientName: "", phone: "", line1: "", city: "", province: "", postalCode: "", isDefault: false };

/** Formulir alamat (tambah / ubah). Validasi akhir tetap di server. */
export function AddressForm({ initial, onSaved, onCancel }: { initial?: Address; onSaved: (a: Address) => void; onCancel?: () => void }) {
  const [f, setF] = useState(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { label: f.label, recipientName: f.recipientName.trim(), phone: f.phone.replace(/[\s-]/g, ""), line1: f.line1.trim(), city: f.city.trim(), province: f.province.trim(), postalCode: f.postalCode.trim(), isDefault: f.isDefault };
      const saved = await call<Address>(initial ? `/addresses/${initial.id}` : "/addresses", { method: initial ? "PATCH" : "POST", body });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Gagal menyimpan alamat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="block"><Label>Nama penerima</Label><Input required autoComplete="name" value={f.recipientName} onChange={set("recipientName")} /></label>
      <label className="block"><Label>No. HP</Label><Input required type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" value={f.phone} onChange={set("phone")} /></label>
      <label className="block sm:col-span-2"><Label>Alamat lengkap</Label><Input required autoComplete="street-address" placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan" value={f.line1} onChange={set("line1")} /></label>
      <label className="block"><Label>Kota / Kabupaten</Label><Input required autoComplete="address-level2" value={f.city} onChange={set("city")} /></label>
      <label className="block"><Label>Provinsi</Label><Input required autoComplete="address-level1" value={f.province} onChange={set("province")} /></label>
      <label className="block"><Label>Kode pos</Label><Input required inputMode="numeric" maxLength={5} autoComplete="postal-code" value={f.postalCode} onChange={set("postalCode")} /></label>
      <label className="block"><Label>Label</Label><Input value={f.label} onChange={set("label")} placeholder="Rumah / Kantor" /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="size-4 accent-brand-600" checked={f.isDefault} onChange={set("isDefault")} /> Jadikan alamat utama</label>
      {error && <p role="alert" className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={busy}>{busy ? "Menyimpan…" : "Simpan alamat"}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>}
      </div>
    </form>
  );
}
