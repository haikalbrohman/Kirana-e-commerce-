import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requireMe } from "@/lib/session";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { IconStore } from "@/components/icons";

export const metadata = { title: "Buka toko" };

export default async function OpenStorePage(props: PageProps<"/seller/open">) {
  const me = await requireMe("/seller/open");
  if (me.store) redirect("/seller");
  const { error } = (await props.searchParams) as { error?: string };

  async function open(formData: FormData) {
    "use server";
    try {
      await api("/seller/store", {
        method: "POST",
        body: JSON.stringify({ name: String(formData.get("name") ?? "").trim(), city: String(formData.get("city") ?? "").trim() || undefined, description: String(formData.get("description") ?? "").trim() || undefined, isUmkm: formData.get("isUmkm") === "on" }),
      });
    } catch (e) {
      redirect(`/seller/open?error=${encodeURIComponent(e instanceof ApiError ? e.message : "Gagal membuka toko")}`);
    }
    redirect("/seller");
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card className="p-6">
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><IconStore size={24} /></div>
        <h1 className="text-xl font-extrabold">Buka toko di Shopia</h1>
        <p className="mt-1 text-sm text-muted">Gratis. Toko ditinjau admin sebelum aktif. Kamu tetap bisa menyiapkan produk selama menunggu.</p>
        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <form action={open} className="mt-5 space-y-4">
          <label className="block"><Label>Nama toko</Label><Input name="name" required minLength={3} maxLength={60} placeholder="Contoh: Batik Bu Sari" /></label>
          <label className="block"><Label>Kota</Label><Input name="city" maxLength={60} placeholder="Contoh: Solo" /></label>
          <label className="block"><Label hint="opsional">Tentang toko</Label><Textarea name="description" rows={3} maxLength={500} placeholder="Ceritakan produk dan keunikan tokomu" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isUmkm" defaultChecked className="size-4 accent-brand-600" /> Toko saya adalah UMKM</label>
          <Button block size="lg">Ajukan pembukaan toko</Button>
        </form>
      </Card>
    </div>
  );
}
