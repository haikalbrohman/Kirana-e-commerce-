import Link from "next/link";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { dateID } from "@/lib/format";
import { requireMe } from "@/lib/session";
import { Button, Card, cx, EmptyState } from "@/components/ui";
import { IconBell } from "@/components/icons";

export const metadata = { title: "Notifikasi" };
type N = { id: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string };

export default async function NotificationsPage() {
  await requireMe("/notifications");
  const { items, unread } = await api<{ items: N[]; unread: number }>("/notifications");
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Notifikasi</h1>
        {unread > 0 && (
          <form action={async () => { "use server"; await api("/notifications/read-all", { method: "POST" }); revalidatePath("/notifications"); }}>
            <Button size="sm" variant="ghost">Tandai semua dibaca</Button>
          </form>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<IconBell size={28} />} title="Belum ada notifikasi" text="Kabar pesanan dan toko akan muncul di sini." />
      ) : (
        <Card className="divide-y divide-line">
          {items.map((n) => (
            <Link key={n.id} href={n.link ?? "#"} className={cx("flex gap-3 p-4 hover:bg-brand-50/40", !n.readAt && "bg-brand-50/60")}>
              <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-brand-500")} />
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{n.title}</p>
                <p className="text-muted">{n.body}</p>
                <p className="mt-1 text-xs text-muted">{dateID(n.createdAt, true)}</p>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
