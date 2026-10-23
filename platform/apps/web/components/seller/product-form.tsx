"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { call, ClientApiError, compressImage } from "@/lib/client";
import { rupiah } from "@/lib/format";
import type { Category } from "@/lib/types";
import { useToast } from "../toast";
import { Badge, Button, Card, cx, Input, Label, Select, Spinner, Textarea } from "../ui";
import { IconCamera, IconImage, IconPlus, IconSparkles, IconTrash, IconX } from "../icons";

type Variant = { id?: string; name: string; options: Record<string, string>; price: string; compareAtPrice: string; stock: string; weightGram: string };
export type ProductInput = {
  id?: string;
  name: string;
  categoryId: string;
  description: string;
  attributes: Record<string, string>;
  tags: string[];
  status: string;
  images: { url: string }[];
  variants: { id: string; name: string; options: Record<string, string>; price: number; compareAtPrice: number | null; stock: number; weightGram: number }[];
};

const MAX_PHOTOS = 8;
const emptyVariant = (name = "Standar", options: Record<string, string> = {}): Variant => ({ name, options, price: "", compareAtPrice: "", stock: "", weightGram: "500" });
const digits = (v: string) => v.replace(/\D/g, "");

export function ProductForm({ categories, initial }: { categories: Category[]; initial?: ProductInput }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [images, setImages] = useState<string[]>(initial?.images.map((i) => i.url) ?? []);
  const [uploading, setUploading] = useState(0);
  const [attrs, setAttrs] = useState<[string, string][]>(Object.entries(initial?.attributes ?? {}).length ? Object.entries(initial!.attributes) : [["", ""]]);
  const [variants, setVariants] = useState<Variant[]>(
    initial?.variants.length
      ? initial.variants.map((v) => ({ id: v.id, name: v.name, options: v.options, price: String(v.price), compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : "", stock: String(v.stock), weightGram: String(v.weightGram) }))
      : [emptyVariant()],
  );
  const [dims, setDims] = useState<{ name: string; values: string }[]>(() => {
    const keys = [...new Set((initial?.variants ?? []).flatMap((v) => Object.keys(v.options)))];
    return keys.map((k) => ({ name: k, values: [...new Set(initial!.variants.map((v) => v.options[k]).filter(Boolean))].join(", ") }));
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------------- foto
  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].slice(0, MAX_PHOTOS - images.length);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const blob = await compressImage(file);
        const form = new FormData();
        form.append("file", blob, "foto.jpg");
        const res = await call<{ url: string }>("/seller/uploads", { form });
        setImages((imgs) => [...imgs, res.url]);
      } catch (e) {
        toast({ tone: "error", title: "Foto gagal diupload", text: e instanceof Error ? e.message : undefined });
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  // ------------------------------------------------------------- varian
  function generateCombinations() {
    const clean = dims.map((d) => ({ name: d.name.trim(), values: [...new Set(d.values.split(",").map((v) => v.trim()).filter(Boolean))] })).filter((d) => d.name && d.values.length);
    if (!clean.length) return setVariants([emptyVariant()]);
    let combos: Record<string, string>[] = [{}];
    for (const d of clean) combos = combos.flatMap((c) => d.values.map((v) => ({ ...c, [d.name]: v })));
    if (combos.length > 50) return toast({ tone: "error", title: "Maksimal 50 kombinasi varian" });
    const first = variants[0];
    setVariants(
      combos.map((options) => {
        const name = Object.values(options).join(" / ");
        const existing = variants.find((v) => v.name === name);
        return existing ? { ...existing, options } : { ...emptyVariant(name, options), price: first?.price ?? "", compareAtPrice: first?.compareAtPrice ?? "", weightGram: first?.weightGram ?? "500" };
      }),
    );
  }
  const setVariant = (i: number, patch: Partial<Variant>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const applyToAll = (key: "price" | "compareAtPrice" | "stock" | "weightGram") => setVariants((vs) => vs.map((v) => ({ ...v, [key]: vs[0][key] })));

  // ------------------------------------------------------------- simpan
  async function save(status: "DRAFT" | "ACTIVE") {
    setError(null);
    if (!images.length && status === "ACTIVE" && !confirm("Produk belum punya foto. Tetap tampilkan?")) return;
    setSaving(status);
    try {
      const body = {
        name: name.trim(),
        categoryId,
        description: description.trim(),
        attributes: Object.fromEntries(attrs.map(([k, v]) => [k.trim(), v.trim()]).filter(([k, v]) => k && v)),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        status,
        images: images.map((url) => ({ url })),
        variants: variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          name: v.name.trim() || "Standar",
          options: v.options,
          price: Number(v.price),
          compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
          stock: Number(v.stock || 0),
          weightGram: Number(v.weightGram || 500),
        })),
      };
      const saved = await call<{ id: string }>(initial?.id ? `/seller/products/${initial.id}` : "/seller/products", { method: initial?.id ? "PATCH" : "POST", body });
      toast({ tone: "success", title: status === "ACTIVE" ? "Produk disimpan & ditampilkan" : "Draf tersimpan" });
      router.push(`/seller/products/${saved.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Gagal menyimpan produk");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-5">
        {error && <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

        {/* Foto */}
        <Card className="p-5">
          <Label hint={`${images.length}/${MAX_PHOTOS} · foto pertama jadi sampul`}>Foto produk</Label>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {images.map((url, i) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                {i === 0 ? (
                  <span className="absolute bottom-1 left-1 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">Sampul</span>
                ) : (
                  <button type="button" onClick={() => setImages((im) => [url, ...im.filter((x) => x !== url)])} className="absolute bottom-1 left-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-brand-800">Jadikan sampul</button>
                )}
                <button type="button" onClick={() => setImages((im) => im.filter((x) => x !== url))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-ink/70 text-white" aria-label="Hapus foto"><IconX size={12} /></button>
              </div>
            ))}
            {Array.from({ length: uploading }, (_, i) => <div key={`u${i}`} className="grid aspect-square place-items-center rounded-xl bg-brand-50 text-brand-600"><Spinner /></div>)}
            {images.length + uploading < MAX_PHOTOS && (
              <>
                <button type="button" onClick={() => cameraRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-300 text-xs font-semibold text-brand-700 hover:bg-brand-50"><IconCamera /> Kamera</button>
                <button type="button" onClick={() => galleryRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-300 text-xs font-semibold text-brand-700 hover:bg-brand-50"><IconImage /> Galeri</button>
              </>
            )}
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
          <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
          <p className="mt-2 text-xs text-muted">Foto dikecilkan otomatis sebelum diupload. Gunakan cahaya terang dan latar polos.</p>
        </Card>

        {/* Info dasar */}
        <Card className="space-y-4 p-5">
          <label className="block"><Label hint={`${name.length}/150`}>Nama produk</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={150} placeholder="Contoh: Kemeja Batik Pria Lengan Panjang Motif Parang" /></label>
          <label className="block">
            <Label>Kategori</Label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Pilih kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Select>
          </label>
          <label className="block"><Label hint={`${description.length}/5000`}>Deskripsi</Label><Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} placeholder="Jelaskan bahan, ukuran, keunggulan, dan cara perawatan" /></label>
          <label className="block"><Label hint="pisahkan dengan koma">Kata kunci</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="batik, kemeja, kondangan" /></label>
        </Card>

        {/* Spesifikasi */}
        <Card className="p-5">
          <Label hint="dipakai untuk perbandingan & AI">Spesifikasi</Label>
          <div className="mt-2 space-y-2">
            {attrs.map(([k, v], i) => (
              <div key={i} className="flex gap-2">
                <Input className="!h-10 w-2/5" placeholder="mis. Bahan" value={k} onChange={(e) => setAttrs((a) => a.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} maxLength={40} />
                <Input className="!h-10 flex-1" placeholder="mis. Katun" value={v} onChange={(e) => setAttrs((a) => a.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} maxLength={200} />
                <button type="button" onClick={() => setAttrs((a) => (a.length > 1 ? a.filter((_, j) => j !== i) : [["", ""]]))} className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-rose-50 hover:text-rose-600" aria-label="Hapus baris"><IconTrash size={16} /></button>
              </div>
            ))}
          </div>
          {attrs.length < 20 && <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => setAttrs((a) => [...a, ["", ""]])}><IconPlus size={16} /> Tambah baris</Button>}
        </Card>

        {/* Varian, harga, stok */}
        <Card className="p-5">
          <Label>Varian, harga & stok</Label>
          <div className="mt-2 rounded-xl bg-canvas p-3">
            <p className="mb-2 text-xs text-muted">Punya pilihan warna/ukuran? Isi jenis opsi lalu tekan “Buat kombinasi”.</p>
            {dims.map((d, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <Input className="!h-10 w-1/3" placeholder="mis. Warna" value={d.name} onChange={(e) => setDims((ds) => ds.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <Input className="!h-10 flex-1" placeholder="mis. Hitam, Putih, Navy" value={d.values} onChange={(e) => setDims((ds) => ds.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))} />
                <button type="button" onClick={() => setDims((ds) => ds.filter((_, j) => j !== i))} className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:text-rose-600" aria-label="Hapus opsi"><IconX size={16} /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {dims.length < 2 && <Button type="button" size="sm" variant="outline" onClick={() => setDims((d) => [...d, { name: d.length ? "Ukuran" : "Warna", values: "" }])}><IconPlus size={16} /> Opsi</Button>}
              <Button type="button" size="sm" variant="secondary" onClick={generateCombinations}>Buat kombinasi</Button>
            </div>
          </div>

          <div className="-mx-5 mt-4 overflow-x-auto px-5">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 font-semibold">Varian</th>
                  <th className="pb-2 font-semibold">Harga jual (Rp) <button type="button" onClick={() => applyToAll("price")} className="ml-1 text-brand-700 underline">samakan</button></th>
                  <th className="pb-2 font-semibold">Harga coret</th>
                  <th className="pb-2 font-semibold">Stok</th>
                  <th className="pb-2 font-semibold">Berat (g)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={i} className="align-top">
                    <td className="py-1 pr-2"><Input className="!h-10" value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} maxLength={60} /></td>
                    <td className="py-1 pr-2"><Input className="!h-10" inputMode="numeric" value={v.price} onChange={(e) => setVariant(i, { price: digits(e.target.value) })} placeholder="120000" /></td>
                    <td className="py-1 pr-2"><Input className={cx("!h-10", v.compareAtPrice && Number(v.compareAtPrice) <= Number(v.price) && "!border-rose-400")} inputMode="numeric" value={v.compareAtPrice} onChange={(e) => setVariant(i, { compareAtPrice: digits(e.target.value) })} placeholder="opsional" /></td>
                    <td className="py-1 pr-2"><Input className="!h-10 w-24" inputMode="numeric" value={v.stock} onChange={(e) => setVariant(i, { stock: digits(e.target.value) })} placeholder="0" /></td>
                    <td className="py-1 pr-2"><Input className="!h-10 w-24" inputMode="numeric" value={v.weightGram} onChange={(e) => setVariant(i, { weightGram: digits(e.target.value) })} /></td>
                    <td className="py-1"><button type="button" disabled={variants.length === 1} onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} className="grid size-10 place-items-center rounded-lg text-muted hover:text-rose-600 disabled:opacity-30" aria-label="Hapus varian"><IconTrash size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">Harga coret hanya ditampilkan jika lebih tinggi dari harga jual (diskon harus valid). Perubahan stok tercatat di riwayat stok.</p>
        </Card>

        <div className="sticky bottom-0 z-30 -mx-4 flex gap-2 border-t border-line bg-white/95 p-3 pb-safe backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <Button variant="outline" className="flex-1 sm:flex-none" disabled={!!saving} onClick={() => save("DRAFT")}>{saving === "DRAFT" ? "Menyimpan…" : "Simpan draf"}</Button>
          <Button className="flex-1 sm:flex-none" disabled={!!saving || initial?.status === "REJECTED"} onClick={() => save("ACTIVE")}>{saving === "ACTIVE" ? "Menyimpan…" : "Simpan & tampilkan"}</Button>
        </div>
      </div>

      <div className="min-w-0 space-y-5 xl:sticky xl:top-24 xl:self-start">
        <PriceGuide categoryId={categoryId} productId={initial?.id} />
        <AiCopyHelper
          name={name}
          attrs={Object.fromEntries(attrs.filter(([k, v]) => k && v))}
          onUseTitle={setName}
          onUseDescription={setDescription}
          onUseKeywords={(k) => setTags((t) => [...new Set([...t.split(",").map((x) => x.trim()).filter(Boolean), ...k])].join(", "))}
          onUseCategory={setCategoryId}
        />
      </div>
    </div>
  );
}

/** Kisaran harga produk aktif sekategori (data nyata, bukan tebakan AI) */
function PriceGuide({ categoryId, productId }: { categoryId: string; productId?: string }) {
  type Insight = { enoughData: boolean; sampleSize: number; p25?: number; median?: number; p75?: number };
  // Simpan bersama id kategorinya agar data lama tidak tampil saat kategori berganti
  const [result, setResult] = useState<{ categoryId: string; data: Insight } | null>(null);
  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    call<Insight>(`/seller/price-insight?categoryId=${categoryId}${productId ? `&productId=${productId}` : ""}`)
      .then((data) => !cancelled && setResult({ categoryId, data }))
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [categoryId, productId]);
  const data = result?.categoryId === categoryId ? result.data : null;
  if (!categoryId || !data) return null;
  return (
    <Card className="p-5">
      <p className="text-sm font-bold">Panduan harga</p>
      {data.enoughData ? (
        <>
          <p className="mt-2 text-sm">Kebanyakan produk sekategori dijual <strong>{rupiah(data.p25!)}–{rupiah(data.p75!)}</strong> (median {rupiah(data.median!)}).</p>
          <p className="mt-1 text-xs text-muted">Dari {data.sampleSize} produk aktif di Shopia. Sesuaikan dengan kualitas & biaya produksimu.</p>
        </>
      ) : (
        <p className="mt-2 text-xs text-muted">Belum cukup data di kategori ini ({data.sampleSize} produk) untuk saran harga.</p>
      )}
    </Card>
  );
}

type CopyResult = { titles: string[]; description: string; keywords: string[]; category: { id: string; name: string } | null; photoIdeas: string[]; promoIdeas: string[]; missingInfo: string[]; source: string; note: string };

/** Asisten penulisan listing. Hanya memberi saran; penjual memilih yang dipakai. */
function AiCopyHelper(props: { name: string; attrs: Record<string, string>; onUseTitle: (t: string) => void; onUseDescription: (d: string) => void; onUseKeywords: (k: string[]) => void; onUseCategory: (id: string) => void }) {
  const [facts, setFacts] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<CopyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const used = (what: string) => toast({ tone: "success", title: `${what} dipakai`, text: "Periksa lagi sebelum menyimpan." });
  return (
    <Card className="border-brand-100 p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-brand-900"><IconSparkles size={18} /> Bantu tulis dengan AI</p>
      <p className="mt-1 text-xs text-muted">Tulis fakta produkmu. AI hanya menyusun dari fakta ini, tidak menambah klaim.</p>
      <Textarea rows={4} className="mt-3 text-sm" value={facts} onChange={(e) => setFacts(e.target.value)} maxLength={2000} placeholder="mis. kemeja batik cap, katun primisima, ukuran M-XL, motif parang, dibuat di Solo" />
      <Button
        size="sm"
        className="mt-2"
        block
        disabled={busy || props.name.trim().length < 3 || facts.trim().length < 10}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            setRes(await call<CopyResult>("/ai/seller/copy", { body: { name: props.name.trim(), facts: facts.trim(), attributes: props.attrs } }));
          } catch (e) {
            setError(e instanceof ClientApiError ? e.message : "Gagal");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Menyusun…" : "Buat saran"}
      </Button>
      {props.name.trim().length < 3 && <p className="mt-1 text-[11px] text-muted">Isi nama produk dulu.</p>}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      {res && (
        <div className="mt-4 space-y-4 text-sm animate-fade-in">
          <div>
            <p className="mb-1 text-xs font-bold text-muted">Judul</p>
            {res.titles.map((t) => (
              <button key={t} type="button" onClick={() => { props.onUseTitle(t); used("Judul"); }} className="mb-1 block w-full rounded-lg border border-line p-2 text-left text-xs hover:border-brand-300 hover:bg-brand-50">{t} <span className="font-semibold text-brand-700">· Pakai</span></button>
            ))}
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-muted">Deskripsi</p>
            <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-lg bg-canvas p-2 text-xs">{res.description}</p>
            <Button type="button" size="sm" variant="secondary" className="mt-1" onClick={() => { props.onUseDescription(res.description); used("Deskripsi"); }}>Pakai deskripsi</Button>
          </div>
          {res.keywords.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-bold text-muted">Kata kunci</p>
              <div className="flex flex-wrap gap-1">{res.keywords.map((k) => <Badge key={k}>{k}</Badge>)}</div>
              <Button type="button" size="sm" variant="ghost" className="mt-1" onClick={() => { props.onUseKeywords(res.keywords); used("Kata kunci"); }}>Tambahkan ke kata kunci</Button>
            </div>
          )}
          {res.category && <Button type="button" size="sm" variant="ghost" onClick={() => { props.onUseCategory(res.category!.id); used("Kategori"); }}>Kategori disarankan: {res.category.name} · Pakai</Button>}
          {res.missingInfo.length > 0 && <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><p className="font-bold">Info yang sebaiknya ditambahkan</p>{res.missingInfo.map((m) => <p key={m}>• {m}</p>)}</div>}
          {res.photoIdeas.length > 0 && <div className="text-xs"><p className="font-bold text-muted">Ide foto</p>{res.photoIdeas.map((m) => <p key={m}>📷 {m}</p>)}</div>}
          {res.promoIdeas.length > 0 && <div className="text-xs"><p className="font-bold text-muted">Ide promosi</p>{res.promoIdeas.map((m) => <p key={m}>💡 {m}</p>)}</div>}
          <p className="text-[11px] text-muted">{res.note}{res.source === "rules" ? " (dibuat tanpa AI karena layanan AI belum aktif)" : ""}</p>
        </div>
      )}
    </Card>
  );
}
