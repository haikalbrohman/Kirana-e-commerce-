import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Footer, Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { getMe } from "@/lib/session";

const urbanist = Urbanist({ variable: "--font-urbanist", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Shopia — Belanja Lebih Cerdas dengan AI", template: "%s · Shopia" },
  description: "Marketplace multi-penjual untuk Indonesia: temukan produk UMKM dan brand pilihan dengan bantuan asisten belanja AI.",
  applicationName: "Shopia",
  appleWebApp: { capable: true, title: "Shopia", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#5a49d8", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const me = await getMe().catch(() => null);
  return (
    <html lang="id" className={`${urbanist.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
          Lewati ke konten
        </a>
        <Providers>
          <Header me={me} />
          <main id="konten" className="flex-1">{children}</main>
          <Footer />
          <BottomNav cartCount={me?.cartCount ?? 0} />
        </Providers>
      </body>
    </html>
  );
}
