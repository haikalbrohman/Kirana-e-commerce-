import Link from "next/link";
import { Suspense } from "react";
import type { Me } from "@/lib/types";
import { IconBell, IconCart, IconSparkles, IconStore, IconUser } from "./icons";
import { SearchBar } from "./search-bar";
import { AssistantButton } from "./assistant";

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Shopia beranda">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-black text-white shadow-sm shadow-brand-700/30">S</span>
      <span className={`text-xl font-extrabold tracking-tight ${light ? "text-white" : "text-ink"}`}>Shopia</span>
    </Link>
  );
}

function IconLink({ href, label, children, badge }: { href: string; label: string; children: React.ReactNode; badge?: number }) {
  return (
    <Link href={href} className="relative grid size-11 place-items-center rounded-xl text-ink transition hover:bg-brand-50 hover:text-brand-700" aria-label={label}>
      {children}
      {!!badge && <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">{badge > 99 ? "99+" : badge}</span>}
    </Link>
  );
}

export function Header({ me }: { me: Me | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:gap-6">
        <Logo />
        <div className="hidden flex-1 md:flex">
          <Suspense fallback={<div className="h-11 flex-1 rounded-xl border border-line bg-white" />}>
            <SearchBar />
          </Suspense>
        </div>
        <nav className="ml-auto flex items-center gap-0.5 md:ml-0" aria-label="Akun">
          <AssistantButton className="hidden h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 lg:flex">
            <IconSparkles size={18} /> Shopia AI
          </AssistantButton>
          {me?.roles.includes("SELLER") ? (
            <IconLink href="/seller" label="Dasbor penjual"><IconStore /></IconLink>
          ) : (
            <Link href="/seller/open" className="hidden h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-slate-50 hover:text-ink lg:flex">
              <IconStore size={18} /> Mulai berjualan
            </Link>
          )}
          {me && <IconLink href="/notifications" label="Notifikasi" badge={me.unreadNotifications}><IconBell /></IconLink>}
          <IconLink href="/cart" label="Keranjang" badge={me?.cartCount}><IconCart /></IconLink>
          {me ? (
            <Link href="/account" className="ml-1 hidden size-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 sm:grid" aria-label="Akun saya">
              {(me.name ?? me.email)[0]?.toUpperCase()}
            </Link>
          ) : (
            <Link href="/login" className="ml-1 hidden h-10 items-center rounded-xl bg-ink px-4 text-sm font-semibold text-white hover:bg-slate-800 sm:flex">
              Masuk
            </Link>
          )}
          {!me && <IconLink href="/login" label="Masuk"><IconUser className="sm:hidden" /></IconLink>}
        </nav>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <Suspense fallback={<div className="h-11 rounded-xl border border-line bg-white" />}>
          <SearchBar />
        </Suspense>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white pb-24 lg:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">Belanja Lebih Cerdas dengan AI. Marketplace untuk pembeli dan UMKM Indonesia.</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold">Belanja</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/search" className="hover:text-brand-700">Semua produk</Link></li>
            <li><Link href="/assistant" className="hover:text-brand-700">Shopia AI</Link></li>
            <li><Link href="/compare" className="hover:text-brand-700">Bandingkan produk</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold">Penjual</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/seller/open" className="hover:text-brand-700">Buka toko</Link></li>
            <li><Link href="/seller" className="hover:text-brand-700">Dasbor penjual</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-bold">Bantuan & keamanan</p>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/help" className="hover:text-brand-700">Pusat bantuan</Link></li>
            <li><Link href="/privacy" className="hover:text-brand-700">Kebijakan privasi</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-muted">© {new Date().getFullYear()} Shopia · Pembayaran diproses oleh mitra berizin (Midtrans)</p>
    </footer>
  );
}
