import { api } from "@/lib/api";
import { dateID } from "@/lib/format";
import { AdminAction } from "@/components/admin-action";
import { StatusTabs } from "@/components/admin-tabs";
import { Badge, Card, EmptyState } from "@/components/ui";
import { IconStore } from "@/components/icons";

export const metadata = { title: "Admin · Toko" };
type Row = { id: string; name: string; slug: string; city: string | null; status: string; createdAt: string; owner: { name: string | null; email: string }; _count: { products: number; orders: number } };

export default async function AdminStores(props: PageProps<"/admin/stores">) {
  const { status = "" } = (await props.searchParams) as { status?: string };
  const rows = await api<Row[]>(`/admin/stores${status ? `?status=${status}` : ""}`);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Toko</h1>
      <StatusTabs base="/admin/stores" current={status} tabs={[["", "Semua"], ["PENDING", "Menunggu"], ["ACTIVE", "Aktif"], ["SUSPENDED", "Nonaktif"]]} />
      {rows.length === 0 ? <EmptyState icon={<IconStore size={28} />} title="Tidak ada toko" /> : (
        <Card className="divide-y divide-line">
          {rows.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.name} <Badge tone={s.status === "ACTIVE" ? "brand" : s.status === "PENDING" ? "amber" : "red"}>{s.status}</Badge></p>
                <p className="text-xs text-muted">{s.owner.name ?? "-"} · {s.owner.email} · {s.city ?? "-"} · daftar {dateID(s.createdAt)} · {s._count.products} produk · {s._count.orders} pesanan</p>
              </div>
              <div className="flex gap-2">
                {s.status !== "ACTIVE" && <AdminAction path={`/admin/stores/${s.id}/approve`} label="Setujui" variant="primary" confirmText={`Aktifkan toko ${s.name}?`} />}
                {s.status !== "SUSPENDED" && <AdminAction path={`/admin/stores/${s.id}/suspend`} label="Nonaktifkan" variant="danger" needsReason />}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
