import { api } from "@/lib/api";
import { getMe } from "@/lib/session";
import { dateID } from "@/lib/format";
import { AdminAction } from "@/components/admin-action";
import { Badge, Card } from "@/components/ui";

export const metadata = { title: "Admin · Pengguna" };
type Row = { id: string; name: string | null; email: string; roles: string[]; status: string; createdAt: string; emailVerified: string | null; store: { name: string } | null };

export default async function AdminUsers(props: PageProps<"/admin/users">) {
  const { q = "" } = (await props.searchParams) as { q?: string };
  const [rows, me] = await Promise.all([api<Row[]>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`), getMe()]);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Pengguna & peran</h1>
      <form className="mb-4"><input name="q" defaultValue={q} placeholder="Cari email atau nama…" className="h-10 w-full rounded-xl border border-line px-3 text-sm" /></form>
      <Card className="divide-y divide-line">
        {rows.map((u) => {
          const isAdmin = u.roles.includes("ADMIN");
          const self = u.id === me?.id;
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{u.name ?? "-"} <span className="font-normal text-muted">· {u.email}</span></p>
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  {u.roles.map((r) => <Badge key={r} tone={r === "ADMIN" ? "red" : r === "SELLER" ? "brand" : "gray"}>{r}</Badge>)}
                  {u.status === "SUSPENDED" && <Badge tone="red">DINONAKTIFKAN</Badge>}
                  {!u.emailVerified && <Badge tone="amber">email belum terverifikasi</Badge>}
                  <span className="text-muted">daftar {dateID(u.createdAt)}{u.store ? ` · toko ${u.store.name}` : ""}</span>
                </div>
              </div>
              {!self && (
                <div className="flex flex-wrap gap-2">
                  <AdminAction path={`/admin/users/${u.id}`} method="PATCH" label={isAdmin ? "Cabut admin" : "Jadikan admin"} body={{ roles: isAdmin ? u.roles.filter((r) => r !== "ADMIN") : [...u.roles, "ADMIN"] }} confirmText={isAdmin ? "Cabut peran admin?" : "Beri akses administrator penuh?"} />
                  <AdminAction path={`/admin/users/${u.id}`} method="PATCH" label={u.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"} variant={u.status === "ACTIVE" ? "danger" : "secondary"} body={{ status: u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }} confirmText={u.status === "ACTIVE" ? "Nonaktifkan akun ini? Pengguna tidak bisa masuk." : "Aktifkan kembali akun ini?"} />
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
