import { api } from "@/lib/api";
import { dateID } from "@/lib/format";
import { Card } from "@/components/ui";

export const metadata = { title: "Admin · Audit log" };
type Row = { id: string; action: string; entityType: string; entityId: string; metadata: Record<string, unknown>; ip: string | null; createdAt: string; actor: { email: string } | null };

export default async function AdminAudit(props: PageProps<"/admin/audit">) {
  const { action = "" } = (await props.searchParams) as { action?: string };
  const rows = await api<Row[]>(`/admin/audit-logs${action ? `?action=${encodeURIComponent(action)}` : ""}`);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Audit log</h1>
      <form className="mb-4"><input name="action" defaultValue={action} placeholder="Filter aksi, mis. store. / product. / payment." className="h-10 w-full rounded-xl border border-line px-3 text-sm" /></form>
      <Card className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.id} className="p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono font-semibold">{r.action}</p>
              <p className="text-xs text-muted">{dateID(r.createdAt, true)}</p>
            </div>
            <p className="text-xs text-muted">{r.actor?.email ?? "sistem"} · {r.entityType} {r.entityId}{r.ip ? ` · IP ${r.ip}` : ""}</p>
            {Object.keys(r.metadata ?? {}).length > 0 && <pre className="mt-1 overflow-x-auto rounded-lg bg-canvas p-2 text-[11px]">{JSON.stringify(r.metadata)}</pre>}
          </div>
        ))}
        {rows.length === 0 && <p className="p-6 text-center text-sm text-muted">Belum ada catatan.</p>}
      </Card>
    </div>
  );
}
