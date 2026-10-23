import { SideNav } from "@/components/side-nav";
import { IconChart, IconPackage, IconSettings, IconStore } from "@/components/icons";

export default function SellerLayout({ children }: LayoutProps<"/seller">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 lg:py-8">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <SideNav
          title="Dasbor penjual"
          items={[
            { href: "/seller", label: "Ringkasan", icon: <IconChart size={18} />, exact: true },
            { href: "/seller/products", label: "Produk", icon: <IconStore size={18} /> },
            { href: "/seller/orders", label: "Pesanan", icon: <IconPackage size={18} /> },
            { href: "/seller/settings", label: "Pengaturan toko", icon: <IconSettings size={18} /> },
          ]}
        />
      </aside>
      <div className="min-w-0 pt-5 lg:pt-0">{children}</div>
    </div>
  );
}
