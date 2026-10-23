import Link from "next/link";
import { signOut } from "@/auth";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Address } from "@/lib/types";
import { Badge, Button, Card } from "@/components/ui";
import { IconBell, IconChevronRight, IconLogout, IconPackage, IconSettings, IconStore } from "@/components/icons";
import { AddressManager } from "./addresses";

export const metadata = { title: "Akun saya" };

export default async function AccountPage() {
  const me = await requireMe("/account");
  const addresses = await api<Address[]>("/addresses");
  const links = [
    { href: "/orders", label: "Pesanan saya", icon: <IconPackage size={20} /> },
    { href: "/notifications", label: `Notifikasi${me.unreadNotifications ? ` (${me.unreadNotifications} baru)` : ""}`, icon: <IconBell size={20} /> },
    me.roles.includes("SELLER") ? { href: "/seller", label: `Dasbor penjual${me.store ? ` · ${me.store.name}` : ""}`, icon: <IconStore size={20} /> } : { href: "/seller/open", label: "Buka toko & mulai berjualan", icon: <IconStore size={20} /> },
    ...(me.roles.includes("ADMIN") ? [{ href: "/admin", label: "Dasbor administrator", icon: <IconSettings size={20} /> }] : []),
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Card className="flex items-center gap-4 p-5">
        <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-bold text-white">{(me.name ?? me.email)[0].toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{me.name ?? "Pengguna Shopia"}</p>
          <p className="truncate text-sm text-muted">{me.email}</p>
          <div className="mt-1 flex gap-1">{me.roles.map((r) => <Badge key={r} tone={r === "ADMIN" ? "red" : r === "SELLER" ? "brand" : "gray"}>{r === "BUYER" ? "Pembeli" : r === "SELLER" ? "Penjual" : "Admin"}</Badge>)}</div>
        </div>
      </Card>

      <Card className="divide-y divide-line">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-3 px-5 py-4 text-sm font-semibold hover:bg-brand-50/50">
            <span className="text-brand-600">{l.icon}</span> {l.label} <IconChevronRight size={18} className="ml-auto text-muted" />
          </Link>
        ))}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-bold">Alamat pengiriman</h2>
        <AddressManager initial={addresses} />
      </Card>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button variant="ghost" className="text-rose-600"><IconLogout size={18} /> Keluar</Button>
      </form>
    </div>
  );
}
