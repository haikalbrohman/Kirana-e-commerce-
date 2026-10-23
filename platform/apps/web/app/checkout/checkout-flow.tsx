"use client";

import { useEffect, useMemo, useState } from "react";
import { call, ClientApiError } from "@/lib/client";
import { rupiah } from "@/lib/format";
import type { Address } from "@/lib/types";
import { AddressForm } from "@/components/address-form";
import { Badge, Button, ButtonLink, Card, cx, ErrorBox, Input, ProductImage, Skeleton } from "@/components/ui";
import { IconCard, IconCheck, IconMapPin, IconShield, IconStore, IconTruck } from "@/components/icons";

type ShipOpt = { id: string; label: string; courier: string; service: string; cost: number; eta: string };
type Quote = {
  groups: { store: { id: string; name: string }; items: { variantId: string; productName: string; variantName: string; imageUrl: string | null; unitPrice: number; quantity: number; lineTotal: number }[]; subtotal: number; shipping: ShipOpt; shippingOptions: ShipOpt[]; discount: number }[];
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  total: number;
  voucher: { code: string; description: string; applied: boolean; error: string | null } | null;
  shippingNote: string;
  paymentProvider: string;
};

const STEPS = ["Alamat", "Pengiriman", "Pembayaran", "Konfirmasi"];

export function CheckoutFlow({ addresses: initialAddresses }: { addresses: Address[] }) {
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressId, setAddressId] = useState(initialAddresses.find((a) => a.isDefault)?.id ?? initialAddresses[0]?.id);
  const [addingAddress, setAddingAddress] = useState(initialAddresses.length === 0);
  const [shipping, setShipping] = useState<Record<string, string>>({});
  const [voucherInput, setVoucherInput] = useState("");
  const [voucher, setVoucher] = useState<string | undefined>();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [placing, setPlacing] = useState(false);
  // Kunci idempotensi: klik ganda / muat ulang tidak membuat pesanan dobel
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  // Hitung ulang total di server setiap pilihan berubah (reloadKey memaksa hitung ulang setelah gagal)
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    call<Quote>("/checkout/quote", { body: { addressId, shipping, voucherCode: voucher } })
      .then((q) => {
        if (cancelled) return;
        setQuote(q);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ClientApiError ? e.message : "Gagal menghitung total";
        if (voucher && /voucher/i.test(msg)) setVoucher(undefined);
        setError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, [addressId, shipping, voucher, reloadKey]);

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    try {
      const res = await call<{ paymentId: string; redirectUrl: string | null }>("/checkout", { body: { addressId, shipping, voucherCode: voucher, notes, idempotencyKey } });
      // Lanjut ke halaman pembayaran Midtrans (status pembayaran diverifikasi di server, bukan dari redirect ini)
      window.location.href = res.redirectUrl ?? `/payments/${res.paymentId}`;
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Gagal membuat pesanan");
      setPlacing(false);
      setReloadKey((k) => k + 1);
    }
  }

  const address = addresses.find((a) => a.id === addressId);
  const canNext = [!!address, !!quote, true, confirmed][step];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        {/* Indikator tahapan */}
        <ol className="mb-5 flex items-center gap-2" aria-label="Tahapan checkout">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={cx("flex items-center gap-2 text-xs font-semibold sm:text-sm", i <= step ? "text-brand-700" : "text-muted")}
                aria-current={i === step ? "step" : undefined}
              >
                <span className={cx("grid size-7 shrink-0 place-items-center rounded-full text-xs transition", i < step ? "bg-brand-600 text-white" : i === step ? "bg-brand-100 text-brand-800 ring-2 ring-brand-600" : "bg-slate-100")}>
                  {i < step ? <IconCheck size={14} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < STEPS.length - 1 && <span className={cx("h-0.5 flex-1 rounded-full", i < step ? "bg-brand-600" : "bg-line")} />}
            </li>
          ))}
        </ol>

        {error && <div className="mb-4"><ErrorBox title="Perlu perhatian" text={error} action={/keranjang|stok|tersedia/i.test(error) ? <ButtonLink href="/cart" size="sm" variant="outline">Buka keranjang</ButtonLink> : undefined} /></div>}

        <Card className="p-5 animate-fade-in" key={step}>
          {step === 0 && (
            <>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><IconMapPin className="text-brand-600" /> Alamat pengiriman</h2>
              {!addingAddress && (
                <div className="space-y-3">
                  {addresses.map((a) => (
                    <label key={a.id} className={cx("flex cursor-pointer gap-3 rounded-xl border p-4 transition", addressId === a.id ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-600/15" : "border-line hover:border-brand-200")}>
                      <input type="radio" name="address" className="mt-1 size-4 accent-brand-600" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                      <span className="text-sm">
                        <span className="font-bold">{a.recipientName}</span> <span className="text-muted">· {a.phone}</span> {a.isDefault && <Badge tone="brand">Utama</Badge>}
                        <span className="mt-1 block text-slate-700">{a.line1}, {a.city}, {a.province} {a.postalCode}</span>
                      </span>
                    </label>
                  ))}
                  <Button variant="outline" onClick={() => setAddingAddress(true)}>+ Tambah alamat baru</Button>
                </div>
              )}
              {addingAddress && (
                <AddressForm
                  onSaved={(a) => {
                    setAddresses((all) => [...all.map((x) => (a.isDefault ? { ...x, isDefault: false } : x)), a]);
                    setAddressId(a.id);
                    setAddingAddress(false);
                  }}
                  onCancel={addresses.length ? () => setAddingAddress(false) : undefined}
                />
              )}
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><IconTruck className="text-brand-600" /> Pilih pengiriman</h2>
              <p className="mb-4 text-xs text-muted">{quote?.shippingNote}</p>
              {!quote ? <Skeleton className="h-40" /> : (
                <div className="space-y-5">
                  {quote.groups.map((g) => (
                    <div key={g.store.id}>
                      <p className="mb-2 flex items-center gap-1.5 text-sm font-bold"><IconStore size={16} /> {g.store.name}</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {g.shippingOptions.map((o) => {
                          const active = g.shipping.id === o.id;
                          return (
                            <button key={o.id} onClick={() => setShipping((s) => ({ ...s, [g.store.id]: o.id }))} className={cx("rounded-xl border p-3 text-left text-sm transition", active ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-600/15" : "border-line hover:border-brand-200")} aria-pressed={active}>
                              <span className="block font-bold">{o.label}</span>
                              <span className="block text-xs text-muted">{o.courier} · {o.eta}</span>
                              <span className="mt-1 block font-semibold">{rupiah(o.cost)}</span>
                            </button>
                          );
                        })}
                      </div>
                      <Input className="mt-2 !h-10 text-sm" maxLength={200} placeholder="Catatan untuk penjual (opsional)" value={notes[g.store.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [g.store.id]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><IconCard className="text-brand-600" /> Pembayaran</h2>
              {quote?.paymentProvider === "mock" ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">⚠️ Mode uji pembayaran aktif (pengembangan). Tidak ada uang sungguhan yang ditagih.</p>
              ) : (
                <p className="text-sm text-slate-700">Pembayaran diproses oleh <strong>Midtrans</strong>, penyedia pembayaran berizin Bank Indonesia. Setelah konfirmasi, kamu diarahkan ke halaman Midtrans untuk memilih metode yang tersedia, misalnya QRIS, e-wallet, virtual account bank, atau kartu.</p>
              )}
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex gap-2"><IconShield size={18} className="shrink-0 text-brand-600" /> Shopia tidak menyimpan data kartu atau rekening kamu.</li>
                <li className="flex gap-2"><IconCheck size={18} className="shrink-0 text-brand-600" /> Pesanan baru diproses setelah pembayaran terkonfirmasi oleh penyedia pembayaran.</li>
                <li className="flex gap-2"><IconCheck size={18} className="shrink-0 text-brand-600" /> Belum bayar dalam 24 jam? Pesanan batal otomatis dan stok dikembalikan.</li>
              </ul>
            </>
          )}

          {step === 3 && quote && (
            <>
              <h2 className="mb-4 text-lg font-bold">Periksa pesananmu</h2>
              <div className="mb-4 rounded-xl bg-canvas p-3 text-sm">
                <p className="font-semibold">Dikirim ke {address?.recipientName} · {address?.phone}</p>
                <p className="text-muted">{address?.line1}, {address?.city}, {address?.province} {address?.postalCode}</p>
              </div>
              <div className="space-y-4">
                {quote.groups.map((g) => (
                  <div key={g.store.id}>
                    <p className="mb-2 text-sm font-bold">{g.store.name} <span className="font-normal text-muted">· {g.shipping.label} ({g.shipping.courier})</span></p>
                    <ul className="space-y-2">
                      {g.items.map((it) => (
                        <li key={it.variantId} className="flex items-center gap-3 text-sm">
                          <div className="w-12 shrink-0 overflow-hidden rounded-lg"><ProductImage src={it.imageUrl} alt={it.productName} /></div>
                          <div className="min-w-0 flex-1"><p className="truncate">{it.productName}</p><p className="text-xs text-muted">{it.variantName} · {it.quantity} × {rupiah(it.unitPrice)}</p></div>
                          <p className="font-semibold">{rupiah(it.lineTotal)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <label className="mt-5 flex items-start gap-2 rounded-xl border border-line p-3 text-sm">
                <input type="checkbox" className="mt-0.5 size-4 accent-brand-600" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                Saya sudah memeriksa alamat, produk, dan total pembayaran, dan setuju untuk melanjutkan pembayaran.
              </label>
            </>
          )}
        </Card>

        <div className="mt-4 flex justify-between gap-3">
          {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}>Kembali</Button> : <span />}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext || addingAddress}>Lanjut</Button>
          ) : (
            <Button size="lg" onClick={placeOrder} disabled={!confirmed || placing || !quote}>{placing ? "Membuat pesanan…" : `Bayar ${quote ? rupiah(quote.total) : ""}`}</Button>
          )}
        </div>
      </div>

      {/* Ringkasan harga (dihitung server) */}
      <div className="min-w-0">
        <Card className="sticky top-24 p-5">
          <h2 className="font-bold">Rincian pembayaran</h2>
          {!quote ? (
            <div className="mt-4 space-y-2"><Skeleton className="h-4" /><Skeleton className="h-4" /><Skeleton className="h-6" /></div>
          ) : (
            <>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Subtotal produk</dt><dd>{rupiah(quote.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Ongkos kirim</dt><dd>{rupiah(quote.shippingTotal)}</dd></div>
                {quote.discountTotal > 0 && <div className="flex justify-between text-brand-700"><dt>Diskon voucher</dt><dd>−{rupiah(quote.discountTotal)}</dd></div>}
                <div className="flex justify-between border-t border-dashed border-line pt-3 text-base font-extrabold"><dt>Total</dt><dd>{rupiah(quote.total)}</dd></div>
              </dl>
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setVoucher(voucherInput.trim().toUpperCase() || undefined);
                }}
              >
                <Input value={voucherInput} onChange={(e) => setVoucherInput(e.target.value)} placeholder="Kode voucher" className="!h-10 uppercase" aria-label="Kode voucher" />
                <Button size="sm" variant="secondary" className="!h-10">Pakai</Button>
              </form>
              {quote.voucher && (
                <p className={cx("mt-2 text-xs", quote.voucher.applied ? "text-brand-700" : "text-rose-600")}>
                  {quote.voucher.applied ? `✓ ${quote.voucher.code}: ${quote.voucher.description}` : quote.voucher.error}
                  <button className="ml-2 underline" onClick={() => { setVoucher(undefined); setVoucherInput(""); }}>hapus</button>
                </p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
