import { requireRole } from "@/lib/session";
import { SideNav } from "@/components/side-nav";
import { IconChart, IconCard, IconFile, IconPackage, IconStore, IconUsers, IconShield } from "@/components/icons";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole("ADMIN", "/admin");
  return (
    <div className="mx-auto max-w-7xl px-4 py-4 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 lg:py-8">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <SideNav
          title="Administrator"
          items={[
            { href: "/admin", label: "Ringkasan", icon: <IconChart size={18} />, exact: true },
            { href: "/admin/stores", label: "Toko", icon: <IconStore size={18} /> },
            { href: "/admin/products", label: "Moderasi produk", icon: <IconShield size={18} /> },
            { href: "/admin/users", label: "Pengguna & peran", icon: <IconUsers size={18} /> },
            { href: "/admin/orders", label: "Pesanan", icon: <IconPackage size={18} /> },
            { href: "/admin/payments", label: "Pembayaran", icon: <IconCard size={18} /> },
            { href: "/admin/audit", label: "Audit log", icon: <IconFile size={18} /> },
          ]}
        />
      </aside>
      <div className="min-w-0 pt-5 lg:pt-0">{children}</div>
    </div>
  );
}
