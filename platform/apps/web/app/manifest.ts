import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shopia — Belanja Lebih Cerdas dengan AI",
    short_name: "Shopia",
    description: "Marketplace UMKM Indonesia dengan asisten belanja AI.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9f8",
    theme_color: "#059669",
    lang: "id",
    categories: ["shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
