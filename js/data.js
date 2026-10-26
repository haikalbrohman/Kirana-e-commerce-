/* =====================================================================
   KIRANA - DATA TOKO
   ---------------------------------------------------------------------
   File ini berisi SEMUA data yang bisa Anda ganti dengan mudah:
   - CONFIG     : pengaturan toko (nama, nomor WhatsApp, ongkir, AI)
   - CATEGORIES : daftar kategori
   - PRODUCTS   : daftar produk -> ada di js/products.js
   - VOUCHERS   : kode voucher/diskon
   - BANNERS    : banner promo di beranda
   - SHIPPING   : pilihan pengiriman
   - PAYMENTS   : metode pembayaran
   - FAQS       : pertanyaan yang sering diajukan

   Produk & foto paling mudah dikelola lewat halaman Admin (#/admin).
   Jika "images" kosong, Kirana menampilkan ilustrasi emoji otomatis.
   ===================================================================== */

/* ---------- Pengaturan umum toko ---------- */
const CONFIG = {
  storeName: "Kirana",
  tagline: "Belanja pintar, dibantu AI",
  // Nomor WhatsApp format internasional TANPA tanda + (62 = Indonesia)
  whatsapp: "6281234567890",
  email: "halo@shopia.id",
  address: "Jl. Kemang Raya No. 10, Jakarta Selatan 12730",
  // Gratis ongkir reguler jika subtotal (setelah diskon) mencapai nilai ini
  freeShippingMin: 150000,
  // Endpoint AI sungguhan (Claude). Kosongkan "" untuk memakai AI lokal
  // bawaan (tanpa server). Jika di-deploy ke Vercel, isi "/api/chat".
  aiEndpoint: "",
  // Waktu berakhirnya Flash Sale (jam berapa setiap hari, format 24 jam)
  flashSaleEndHour: 23,
  // Repo GitHub tempat website ini disimpan. Dipakai halaman Admin untuk
  // menyimpan produk & foto. "branch" = branch yang dipakai GitHub Pages.
  github: {
    owner: "haikalbrohman",
    repo: "Kirana-e-commerce-",
    branch: "claude/shopia-ecommerce-build-05ok69",
  },
};

/* ---------- Kategori ---------- */
const CATEGORIES = [
  { id: "fashion-wanita", name: "Fashion Wanita", icon: "👗" },
  { id: "fashion-pria", name: "Fashion Pria", icon: "👕" },
  { id: "sepatu", name: "Sepatu", icon: "👟" },
  { id: "elektronik", name: "Elektronik", icon: "🎧" },
  { id: "kecantikan", name: "Kecantikan", icon: "💄" },
  { id: "rumah", name: "Rumah & Dapur", icon: "🏠" },
  { id: "umkm", name: "UMKM Lokal", icon: "🧺" },
];

/* ---------- Produk ----------
   Daftar produk ada di file js/products.js (diperbarui otomatis oleh
   halaman Admin).
   Keterangan field:
   id            : kode unik (jangan sama)
   name          : nama produk
   category      : id kategori (lihat CATEGORIES)
   price         : harga jual (Rupiah, angka saja)
   originalPrice : harga coret sebelum diskon (isi sama dengan price jika tidak diskon)
   rating        : 0 - 5
   sold          : jumlah terjual
   stock         : jumlah stok
   emoji, color  : ilustrasi pengganti foto (dipakai jika images kosong)
   images        : array URL foto produk
   variants      : { ukuran: [...], warna: [...] } (boleh dikosongkan)
   tags          : kata kunci untuk pencarian & AI
   createdAt     : tanggal produk ditambahkan (untuk "Produk Terbaru")
   flashSale     : true jika ikut Flash Sale
   reviews       : daftar ulasan
------------------------------------------------------------------ */

/* ---------- Voucher ----------
   type: "percent" (persen) atau "fixed" (potongan Rupiah) atau "shipping" (gratis ongkir)
   minSpend : minimal belanja
   maxDiscount : batas maksimal potongan (untuk percent)
------------------------------------------------------------------ */
const VOUCHERS = [
  { code: "KIRANABARU", type: "percent", value: 15, minSpend: 100000, maxDiscount: 50000, desc: "Diskon 15% untuk pengguna baru (maks. Rp50.000)" },
  { code: "HEMAT20K", type: "fixed", value: 20000, minSpend: 150000, desc: "Potongan Rp20.000 min. belanja Rp150.000" },
  { code: "GRATISONGKIR", type: "shipping", value: 0, minSpend: 50000, desc: "Gratis ongkir semua kurir, min. belanja Rp50.000" },
  { code: "UMKMJUARA", type: "percent", value: 10, minSpend: 0, maxDiscount: 25000, desc: "Diskon 10% tanpa minimal (maks. Rp25.000)" },
];

/* ---------- Banner promo beranda ---------- */
const BANNERS = [
  { title: "Flash Sale 10.10", subtitle: "Diskon hingga 50% + gratis ongkir", cta: "Belanja Sekarang", link: "#/katalog?sort=diskon", bg: ["#0a3fd8", "#22a6ff"], emoji: "⚡" },
  { title: "Tanya Kirana AI", subtitle: "Cari barang cukup dengan ngobrol. Contoh: \"sepatu putih di bawah 300rb\"", cta: "Coba AI", link: "#ai", bg: ["#0838b8", "#1f8bff"], emoji: "🤖" },
  { title: "Dukung UMKM Lokal", subtitle: "Pakai kode UMKMJUARA, hemat 10%", cta: "Lihat Produk UMKM", link: "#/katalog?cat=umkm", bg: ["#1a5cff", "#5fd0ff"], emoji: "🧺" },
];

/* ---------- Pilihan pengiriman ---------- */
const SHIPPING = [
  { id: "hemat", name: "Hemat", eta: "4-6 hari", cost: 9000 },
  { id: "reguler", name: "Reguler", eta: "2-3 hari", cost: 15000 },
  { id: "express", name: "Express", eta: "1 hari", cost: 28000 },
  { id: "instan", name: "Instan (dalam kota)", eta: "3 jam", cost: 45000 },
];

/* ---------- Metode pembayaran ---------- */
const PAYMENTS = [
  { id: "qris", name: "QRIS", desc: "Bayar dengan semua e-wallet & m-banking", icon: "📱" },
  { id: "ewallet", name: "E-Wallet", desc: "GoPay, OVO, DANA, ShopeePay", icon: "👛" },
  { id: "va", name: "Transfer Virtual Account", desc: "BCA, BNI, BRI, Mandiri", icon: "🏦" },
  { id: "cod", name: "Bayar di Tempat (COD)", desc: "Bayar tunai saat barang sampai", icon: "💵" },
];

/* ---------- FAQ ---------- */
const FAQS = [
  { q: "Berapa lama pengiriman pesanan?", a: "Tergantung kurir yang dipilih: Hemat 4-6 hari, Reguler 2-3 hari, Express 1 hari, dan Instan 3 jam untuk dalam kota." },
  { q: "Bagaimana cara mendapatkan gratis ongkir?", a: `Belanja minimal Rp${CONFIG.freeShippingMin.toLocaleString("id-ID")} untuk gratis ongkir Reguler, atau gunakan kode voucher GRATISONGKIR.` },
  { q: "Metode pembayaran apa saja yang tersedia?", a: "QRIS, e-wallet (GoPay, OVO, DANA, ShopeePay), transfer virtual account bank, dan bayar di tempat (COD)." },
  { q: "Apakah bisa retur atau tukar ukuran?", a: "Bisa. Ajukan retur maksimal 7 hari setelah barang diterima, dengan kondisi barang belum dipakai dan label masih terpasang." },
  { q: "Bagaimana cara memakai kode voucher?", a: "Masukkan kode voucher di halaman Keranjang atau Checkout, lalu tekan tombol Pakai. Diskon akan langsung terlihat di ringkasan pesanan." },
  { q: "Apa itu Kirana AI?", a: "Kirana AI adalah asisten belanja yang membantu Anda mencari produk dengan bahasa sehari-hari, memberi rekomendasi, dan merangkum ulasan pembeli." },
  { q: "Apakah produk di Kirana original?", a: "Ya. Semua produk dikurasi dan kami memberi garansi uang kembali jika produk tidak sesuai deskripsi." },
];
