import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/session";
import { Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";

export const metadata = { title: "Pengaturan toko" };
type Store = { name: string; slug: string; description: string | null; city: string | null; isUmkm: boolean; status: string };

export default async function SellerSettings(props: PageProps<"/seller/settings">) {
  await requireRole("SELLER", "/seller/settings");
  const store = await api<Store>("/seller/store");
  const { saved, error } = (await props.searchParams) as { saved?: string; error?: string };

  async function update(formData: FormData) {
    "use server";
    try {
      await api("/seller/store", { method: "PATCH", body: JSON.stringify({ name: String(formData.get("name")).trim(), city: String(formData.get("city") ?? "").trim() || undefined, description: String(formData.get("description") ?? "").trim() || undefined, isUmkm: formData.get("isUmkm") === "on" }) });
    } catch (e) {
      redirect(`/seller/settings?error=${encodeURIComponent(e instanceof ApiError ? e.message : "Gagal menyimpan")}`);
    }
    revalidatePath("/seller");
    redirect("/seller/settings?saved=1");
  }

  return (
    <div className="max-w-xl">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Pengaturan toko</h1>
        <Badge tone={store.status === "ACTIVE" ? "brand" : store.status === "PENDING" ? "amber" : "red"}>{{ ACTIVE: "Aktif", PENDING: "Menunggu persetujuan", SUSPENDED: "Dinonaktifkan" }[store.status]}</Badge>
      </div>
      {saved && <p className="mb-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">Perubahan tersimpan.</p>}
      {error && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <Card className="p-5">
        <form action={update} className="space-y-4">
          <label className="block"><Label>Nama toko</Label><Input name="name" defaultValue={store.name} required minLength={3} maxLength={60} /></label>
          <label className="block"><Label>Kota</Label><Input name="city" defaultValue={store.city ?? ""} maxLength={60} /></label>
          <label className="block"><Label>Tentang toko</Label><Textarea name="description" rows={4} defaultValue={store.description ?? ""} maxLength={500} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isUmkm" defaultChecked={store.isUmkm} className="size-4 accent-brand-600" /> Toko UMKM</label>
          <p className="text-xs text-muted">Alamat toko: shopia.id/store/{store.slug}</p>
          <Button>Simpan</Button>
        </form>
      </Card>
    </div>
  );
}
