# 🛍️ Shopia — Belanja Pintar, Dibantu AI

Website e-commerce mobile-first untuk anak muda Indonesia (18–30 tahun).
Gaya modern-minimalis, warna utama **ungu & putih**, bahasa Indonesia, mata uang Rupiah.

Dibuat dengan **HTML + CSS + JavaScript murni** — tanpa proses build. Cukup buka `index.html`
atau upload ke hosting statis (GitHub Pages, Netlify, Vercel).

## ✨ Yang membuat Shopia beda

| Fitur | Keterangan |
|---|---|
| 🔍 **Pencarian AI** | Ketik bahasa sehari-hari: *"sepatu putih di bawah 300rb"*, *"skincare jerawat"*, *"kado 100rb-300rb"*. AI memahami kategori, warna, budget, rating, dan urutan. |
| 💬 **Shopia AI (chat)** | Asisten belanja: rekomendasi produk, info ongkir, voucher, pembayaran, retur, dan status pesanan. Produk tampil sebagai kartu yang bisa diklik. |
| 🎯 **Rekomendasi personal** | "Pilihan AI untukmu" berdasarkan produk yang dilihat, keranjang, dan wishlist. |
| 📝 **Ringkasan ulasan AI** | Di halaman produk: kelebihan & catatan dari ulasan pembeli, tanpa harus membaca semua. |
| 🚚 **Progress gratis ongkir** | Keranjang menunjukkan berapa lagi untuk dapat gratis ongkir. |
| ⚡ **Flash sale + hitung mundur**, voucher 1-klik, beli lagi 1-klik, pelacakan status pesanan. |

## 📄 Halaman

- **Beranda** — banner promo (slider), kategori, flash sale, voucher, rekomendasi AI, terlaris, terbaru
- **Katalog** — filter kategori/harga/rating, urutkan (7 pilihan), pencarian AI
- **Detail produk** — galeri, harga & diskon, varian ukuran/warna, stok, jumlah, deskripsi, ulasan, ringkasan AI, produk serupa
- **Keranjang** — ubah jumlah, hapus, kode voucher, subtotal
- **Checkout** — alamat, 4 pilihan pengiriman, 4 metode pembayaran (QRIS, e-wallet, VA, COD), ringkasan pesanan
- **Akun** — daftar/masuk, riwayat pesanan (dengan status), wishlist
- **Tentang kami, Kontak, FAQ**

Plus: tombol **WhatsApp mengambang**, notifikasi **"ditambahkan ke keranjang"**, dan data
keranjang/wishlist/akun **tetap tersimpan** saat halaman dimuat ulang (localStorage).

## 🗂️ Struktur file

```
index.html        Kerangka halaman (header, footer, navigasi bawah)
css/style.css     Semua tampilan. Ganti warna di bagian :root
js/data.js        ⭐ DATA TOKO — produk, kategori, voucher, ongkir, FAQ, nomor WA
js/store.js       Penyimpanan keranjang, wishlist, akun, pesanan (localStorage)
js/ai.js          Shopia AI (pencarian, chat, rekomendasi, ringkasan ulasan)
js/app.js         Router & semua halaman
api/chat.js       (Opsional) Server AI pakai Claude untuk Vercel
manifest.json     Identitas aplikasi (nama, ikon, warna)
sw.js             Service worker: install & mode offline
icons/            Ikon aplikasi
```

## ✏️ Cara mengganti data

Semua yang perlu Anda ubah ada di **`js/data.js`**:

- **Nomor WhatsApp**: `CONFIG.whatsapp` (format `628xxxx`, tanpa `+`)
- **Produk**: edit array `PRODUCTS`. Untuk foto asli, isi `images: ["https://.../foto.jpg"]`.
  Jika kosong, ditampilkan ilustrasi emoji.
- **Voucher**: array `VOUCHERS` (`percent`, `fixed`, atau `shipping`)
- **Batas gratis ongkir**: `CONFIG.freeShippingMin`
- **Warna tema**: variabel `--primary` dkk. di atas `css/style.css`

Kode voucher contoh: `SHOPIABARU`, `HEMAT20K`, `GRATISONGKIR`, `UMKMJUARA`.

## 🚀 Menjalankan

**Lokal:** buka `index.html` di browser, atau `npm start` lalu buka http://localhost:3000

**GitHub Pages:** Settings → Pages → Branch `main` / root. Selesai.

## 📲 Aplikasi Shopia (PWA)

Shopia bisa di-install seperti aplikasi: ikon di layar HP, terbuka layar penuh, dan tetap
bisa dibuka saat offline.

- **Android (Chrome):** buka website, tekan **Install** pada ajakan yang muncul, atau menu ⋮ → **Install aplikasi**.
- **iPhone (Safari):** tombol **Bagikan** ⬆️ → **Tambah ke Layar Utama**.
- Tombol **Install Aplikasi Shopia** juga ada di halaman Akun.

File terkait: `manifest.json` (nama & ikon), `sw.js` (mode offline), folder `icons/`.
Jika mengganti banyak file dan ingin semua pengguna langsung memuat ulang, naikkan
`VERSION` di `sw.js`.

## 🤖 Mengaktifkan AI Claude (opsional)

Secara default Shopia AI berjalan **lokal di browser** (gratis, tanpa server). Agar chat
ditenagai Claude dan bisa menjawab pertanyaan apa pun secara alami:

1. Deploy repo ini ke [Vercel](https://vercel.com) (folder `api/` otomatis jadi server).
2. Tambahkan Environment Variable `ANTHROPIC_API_KEY` (dari https://console.anthropic.com).
3. Di `js/data.js` ubah `aiEndpoint: ""` menjadi `aiEndpoint: "/api/chat"`.

API key hanya disimpan di server. Jika server bermasalah, chat otomatis kembali ke AI lokal.

## ⚠️ Catatan untuk produksi

Ini versi frontend siap pakai untuk demo/MVP. Untuk toko sungguhan, sambungkan ke backend:
akun & pesanan masih tersimpan di browser (bukan database), dan pembayaran masih simulasi
(perlu payment gateway seperti Midtrans/Xendit).
