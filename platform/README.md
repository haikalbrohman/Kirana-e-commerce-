# Shopia Platform — Marketplace Multi-Penjual dengan AI

> **Belanja Lebih Cerdas dengan AI.** Marketplace untuk pembeli, penjual UMKM, dan administrator.

Folder ini berisi versi **full-stack** Shopia. Situs statis lama (folder induk repo) tetap
berjalan di GitHub Pages dan tidak terpengaruh.

```
platform/
├── apps/
│   ├── web/        Next.js 16 + Tailwind 4 + Auth.js  → tampilan pembeli, penjual, admin
│   └── api/        NestJS 12 (REST)                     → logika bisnis, pembayaran, AI
├── packages/
│   └── db/         Prisma 7 + PostgreSQL                → skema, migrasi, data contoh
└── docker-compose.yml   PostgreSQL lokal
```

## Arsitektur singkat

```
Browser ──► Next.js (web)
              ├─ Auth.js: login Google / link email, sesi terenkripsi (cookie)
              ├─ Server Components memanggil API dengan token 5 menit (HS256)
              └─ /api/backend/*  (BFF) → panggilan dari browser, cek origin (CSRF)
                     │
                     ▼
            NestJS (api) ──► PostgreSQL (Prisma)
              ├─ AuthGuard: verifikasi token + MUAT ULANG peran & status dari database
              ├─ Checkout: harga, ongkir, diskon dihitung server; stok dipotong atomik
              ├─ Midtrans Snap ◄── webhook bertanda tangan (dicek ulang ke Midtrans)
              ├─ Penyimpanan foto: lokal atau S3-compatible (R2/Supabase/S3)
              └─ AI: Claude (opsional) dengan fallback mesin aturan lokal
```

Prinsip yang dipegang:
- **Browser tidak dipercaya** untuk harga, stok, peran, atau status pembayaran.
- **Pembayaran dianggap lunas hanya dari webhook terverifikasi**, bukan dari redirect browser.
- **AI hanya memakai data katalog**; kartu produk (harga/stok) selalu diambil dari database.
- **Shopia tidak menyimpan dana.** Pencairan ke penjual lewat mitra pembayaran berizin.

## Tampilan

Token warna ada di `apps/web/app/globals.css`, masing-masing dengan peran tetap:
**indigo/ungu** (`brand-*`) untuk identitas & elemen aktif, **lime** (`lime-*`) untuk tombol aksi
utama, **hijau daun** (`leaf-*`) untuk semua fitur AI. Font: Urbanist. Komponen dasar memakai sudut
membulat besar dan tombol pil (`components/ui.tsx`).

## Fitur & status

| Area | Sudah jalan | Belum / tahap berikutnya |
|---|---|---|
| Akun | Login Google, link email (verifikasi email otomatis), peran Pembeli/Penjual/Admin, nonaktifkan akun | Edit profil (nama/HP), hapus akun mandiri (UU PDP) |
| Katalog | Kategori, varian (warna/ukuran), stok per varian, foto, filter harga/rating/kategori, 6 urutan, halaman toko | Pencarian semantik (embeddings + pgvector) |
| Keranjang & checkout | Keranjang per toko, alamat, 4 tahap checkout, konfirmasi, voucher, idempotensi (klik ganda aman) | — |
| Pembayaran | Midtrans Snap (sandbox/production), webhook tervalidasi & idempoten, kedaluwarsa otomatis | Refund otomatis via API Midtrans (saat ini dicatat untuk diproses admin) |
| Pengiriman | Tarif perkiraan berdasarkan berat (3 layanan), nomor resi, status | Ongkir real-time & pelacakan (Biteship/RajaOngkir) |
| Pesanan | Satu pembayaran → pesanan per toko, snapshot harga & alamat, linimasa, konfirmasi terima, selesai otomatis 3 hari | — |
| Ulasan | Hanya pembeli yang barangnya sampai, 1 ulasan per item, rating dihitung ulang | Foto ulasan |
| Penjual | Buka toko (perlu persetujuan admin), produk + varian + foto (kamera/galeri), riwayat stok, proses/kirim pesanan, grafik penjualan, laporan pendapatan | Voucher toko, pencairan dana otomatis |
| Admin | Statistik, setujui/nonaktifkan toko, turunkan/pulihkan produk, peran & status pengguna, pantau pesanan & pembayaran, audit log | Ekspor laporan |
| AI | Asisten belanja, pencarian bahasa alami, perbandingan produk, bantu tulis listing, insight penjualan, panduan harga (data nyata) | Visual search (unggah foto) |
| PWA | Manifest + ikon (bisa di-install) | Notifikasi push, mode offline |

## Menjalankan di komputer (lokal)

Butuh **Node.js 22+**, **npm 11+** (`npm i -g npm@11`), dan **PostgreSQL 16** (atau Docker).

```bash
cd platform
docker compose up -d                 # PostgreSQL di localhost:5432 (atau pakai Postgres sendiri)
npm install

# Salin contoh environment lalu isi rahasia (lihat komentar di tiap file)
cp packages/db/.env.example packages/db/.env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
#   API_JWT_SECRET harus SAMA di api & web. AUTH_SECRET: openssl rand -base64 32
#   Untuk mencoba cepat: AUTH_DEMO_LOGIN=true di web (hanya berlaku di pengembangan)

npm run db:migrate                   # buat tabel
npm run db:seed                      # data contoh (MENGHAPUS data lama)
npm run build:api && npm run start:api   # API di http://localhost:4000
npm run dev:web                      # web di http://localhost:3000
```

Akun demo (data contoh): `pembeli@shopia.id`, `rumahbatik@shopia.id` (penjual), `admin@shopia.id`.
Tanpa layanan email, link masuk dicetak di terminal web. Dengan `AUTH_DEMO_LOGIN=true`, halaman
masuk menampilkan tombol login demo (otomatis nonaktif di production).

Tanpa akun Midtrans, `PAYMENT_PROVIDER=mock` menampilkan **simulator pembayaran** yang mengirim
notifikasi bertanda tangan persis seperti Midtrans (ditolak di production).

## Pengujian

```bash
cd platform
npm test        # unit (parser AI) + e2e API terhadap database uji "shopia_test"
```

Uji e2e mencakup: filter & pencarian, keamanan token/peran, akun nonaktif, penolakan field
liar, checkout + voucher + idempotensi, webhook palsu/nominal salah/duplikat, kedaluwarsa
mengembalikan stok, **dua pembeli rebutan stok terakhir** (hanya satu berhasil), upload foto
palsu ditolak, toko belum disetujui tidak tampil, riwayat stok, moderasi + audit log, alur
penjual hingga ulasan. Atur `TEST_DATABASE_URL` jika database uji berbeda.

## Menerbitkan (deploy)

Rekomendasi gratis/murah untuk awal:

| Bagian | Layanan | Catatan |
|---|---|---|
| Database | [Neon](https://neon.tech) atau [Supabase](https://supabase.com) (PostgreSQL) | Salin connection string ke `DATABASE_URL` (api & web) |
| API | [Render](https://render.com), [Railway](https://railway.app), atau [Fly.io](https://fly.io) | Lihat perintah di bawah |
| Web | [Vercel](https://vercel.com) | Root directory: `platform/apps/web` |
| Foto | [Cloudflare R2](https://developers.cloudflare.com/r2/) | `STORAGE_DRIVER=s3` + kredensial |
| Pembayaran | [Midtrans](https://midtrans.com) (Sandbox dulu) | Server key ke API |
| Email login | [Resend](https://resend.com) | `AUTH_RESEND_KEY` di web, verifikasi domain pengirim |
| AI | [Anthropic Console](https://console.anthropic.com) | `ANTHROPIC_API_KEY` di API (opsional) |

**API (mis. Render "Web Service", root: `platform`):**
- Build: `npm ci && npm run build:api && npm run db:migrate` (migrasi ikut build bila paket
  gratis tidak punya *pre-deploy command*). **Jangan** jalankan `db:seed` di production.
- Start: `npm run start:api`
- Environment: isi semua dari `apps/api/.env.example` dengan `NODE_ENV=production`,
  `PAYMENT_PROVIDER=midtrans`, `STORAGE_DRIVER=s3`, `WEB_ORIGIN=https://domain-web-kamu`.

**Web (Vercel):** root directory `platform/apps/web`, install command `cd ../.. && npm ci`,
build command `cd ../.. && npm run build:web`. Isi environment dari `apps/web/.env.example`
(`AUTH_URL` = domain web, `API_URL` = URL API, `API_JWT_SECRET` sama dengan API).
Isi `ADMIN_EMAILS` dengan email kamu: akun itu otomatis menjadi Admin saat pertama masuk.

**Midtrans:** Dashboard → Settings → Configuration → *Payment Notification URL*:
`https://URL-API-KAMU/v1/payments/midtrans/notification`. Uji dengan kartu/QRIS sandbox, baru
ganti ke kunci production dan `MIDTRANS_IS_PRODUCTION=true`.

**Google login:** Google Cloud Console → Credentials → OAuth Client (Web), redirect URI
`https://DOMAIN-WEB/api/auth/callback/google`, isi `AUTH_GOOGLE_ID` & `AUTH_GOOGLE_SECRET`.

**Domain sendiri:** arahkan domain ke Vercel (web) dan subdomain `api.` ke hosting API.

## Keamanan & privasi

Sudah diterapkan:
- Validasi input ketat (field tak dikenal ditolak), constraint database (stok ≥ 0, total pesanan konsisten, rating 1–5, kuota voucher).
- Otorisasi di setiap endpoint; peran & status dibaca dari database pada setiap permintaan.
- Proteksi CSRF (cek origin di BFF + proteksi bawaan Server Actions), cookie sesi terenkripsi httpOnly, header keamanan (HSTS, X-Frame-Options, nosniff), Helmet di API, CORS terbatas.
- Rate limiting global + lebih ketat untuk checkout, AI, upload.
- Webhook: tanda tangan SHA-512, cek ulang status ke Midtrans, cocokkan nominal, idempoten, payload disimpan tanpa data kartu.
- Upload: jenis file dicek dari isi (bukan nama), maks 5 MB, nama acak, URL foto harus dari penyimpanan Shopia.
- Audit log untuk semua tindakan admin & kejadian pembayaran yang perlu perhatian.
- AI: API key hanya di server, batas permintaan per pengguna & token harian, log tanpa isi percakapan, data penjual diperlakukan sebagai data (anti prompt-injection), ID produk dari AI divalidasi.
- Nama pengulas disamarkan; alamat hanya terlihat oleh penjual pesanan terkait.

Perlu dilakukan sebelum peluncuran publik:
- Tinjau **Kebijakan Privasi** (`/privacy`) dengan penasihat hukum sesuai **UU No. 27/2022 (PDP)**, tambahkan fitur ekspor & hapus data mandiri, dan tetapkan masa retensi.
- Aktifkan **backup otomatis** + uji pemulihan di penyedia database (Neon/Supabase menyediakan point-in-time recovery).
- Tambahkan Content-Security-Policy dengan nonce, pemantauan error (mis. Sentry), dan alerting.
- Kerja sama mitra pembayaran untuk **pencairan dana** penjual (mis. Midtrans Iris / Xendit) — jangan menampung dana sendiri.
