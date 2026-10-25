/* =====================================================================
   KIRANA - SERVICE WORKER (membuat Kirana bisa di-install & dibuka offline)
   ---------------------------------------------------------------------
   Strategi: "network-first"
   - Saat online : selalu ambil versi terbaru dari server (produk baru
                   di data.js langsung terlihat), lalu simpan salinannya.
   - Saat offline: pakai salinan terakhir yang tersimpan.
   Naikkan angka VERSION jika ingin menghapus semua salinan lama.
   ===================================================================== */

const VERSION = "kirana-v10";

// File inti yang disimpan saat aplikasi pertama kali di-install
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/data.js",
  "./js/products.js",
  "./js/store.js",
  "./js/ai.js",
  "./js/admin.js",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/logo-mark.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting(); // langsung aktif tanpa menunggu tab ditutup
});

// Hapus cache versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Hanya tangani permintaan GET; jangan simpan panggilan AI (/api/...)
  if (req.method !== "GET" || url.pathname.includes("/api/")) return;

  // File dari website ini + font Google
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com");
  if (!sameOrigin && !isFont) return;

  event.respondWith(
    // "no-cache": selalu cek ke server apakah ada versi baru (bukan salinan lama browser)
    fetch(req, sameOrigin ? { cache: "no-cache" } : {})
      .then((res) => {
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((cached) => cached || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()))
      )
  );
});
