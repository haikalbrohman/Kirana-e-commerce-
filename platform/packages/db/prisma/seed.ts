/**
 * Data contoh untuk pengembangan: kategori, toko UMKM, produk + varian,
 * voucher, akun demo, serta pesanan selesai yang menjadi dasar ulasan.
 *
 * Jalankan: npm run seed -w @shopia/db
 * PERINGATAN: seed MENGHAPUS data lama. Diblokir saat NODE_ENV=production.
 */
import "dotenv/config";
import { createPrismaClient, Role, StoreStatus, ProductStatus, VoucherType } from "../src";

if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "true") {
  console.error("Seed diblokir di production. Set SEED_ALLOW_PRODUCTION=true jika benar-benar perlu.");
  process.exit(1);
}

const prisma = createPrismaClient();

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const CATEGORIES = [
  { name: "Fashion Wanita", slug: "fashion-wanita", icon: "👗" },
  { name: "Fashion Pria", slug: "fashion-pria", icon: "👕" },
  { name: "Sepatu", slug: "sepatu", icon: "👟" },
  { name: "Tas & Aksesoris", slug: "tas-aksesoris", icon: "👜" },
  { name: "Elektronik", slug: "elektronik", icon: "💻" },
  { name: "Kecantikan", slug: "kecantikan", icon: "💄" },
  { name: "Rumah & Dapur", slug: "rumah-dapur", icon: "🏠" },
  { name: "Makanan & Minuman", slug: "makanan-minuman", icon: "🍪" },
];

type VariantSeed = { name: string; options?: Record<string, string>; price: number; compareAtPrice?: number; stock: number; weightGram?: number };
type ProductSeed = {
  name: string;
  category: string;
  description: string;
  attributes: Record<string, string>;
  tags: string[];
  variants: VariantSeed[];
};

// Variasi warna x ukuran dengan harga sama
function grid(colors: string[], sizes: string[], price: number, compareAtPrice: number | undefined, stock: number, weightGram = 300): VariantSeed[] {
  const out: VariantSeed[] = [];
  for (const c of colors)
    for (const s of sizes) out.push({ name: `${c} / ${s}`, options: { Warna: c, Ukuran: s }, price, compareAtPrice, stock, weightGram });
  return out;
}

const STORES: { owner: { email: string; name: string }; store: { name: string; city: string; description: string }; products: ProductSeed[] }[] = [
  {
    owner: { email: "rumahbatik@shopia.id", name: "Sari Wulandari" },
    store: { name: "Rumah Batik Sari", city: "Solo", description: "Batik tulis & cap modern dari pengrajin Solo sejak 2015." },
    products: [
      {
        name: "Kemeja Batik Pria Lengan Panjang Motif Parang",
        category: "fashion-pria",
        description: "Kemeja batik cap motif parang dengan bahan katun primisima yang adem. Cocok untuk kerja, kondangan, dan acara resmi.",
        attributes: { Bahan: "Katun primisima", Teknik: "Batik cap", Lengan: "Panjang", Perawatan: "Cuci tangan, jangan diperas" },
        tags: ["batik", "kemeja", "formal", "kerja", "kondangan"],
        variants: grid(["Coklat Sogan", "Biru Indigo"], ["M", "L", "XL"], 189000, 249000, 12, 350),
      },
      {
        name: "Dress Batik Wanita Midi Kombinasi",
        category: "fashion-wanita",
        description: "Dress midi batik kombinasi polos dengan potongan A-line dan tali pinggang. Bahan katun rayon jatuh dan tidak panas.",
        attributes: { Bahan: "Katun rayon", Panjang: "Midi (± 115 cm)", Teknik: "Batik cap" },
        tags: ["dress", "batik", "kondangan", "hadiah ibu"],
        variants: grid(["Hijau Sage", "Maroon"], ["S", "M", "L"], 229000, 299000, 8, 300),
      },
      {
        name: "Selendang Batik Tulis Sutra",
        category: "tas-aksesoris",
        description: "Selendang batik tulis di atas kain sutra, dibuat tangan selama ± 2 minggu. Hadiah istimewa untuk ibu atau orang terkasih.",
        attributes: { Bahan: "Sutra", Teknik: "Batik tulis", Ukuran: "200 x 55 cm" },
        tags: ["selendang", "batik tulis", "hadiah", "hadiah ibu", "premium"],
        variants: [{ name: "Motif Kawung", options: { Motif: "Kawung" }, price: 450000, stock: 5, weightGram: 150 }, { name: "Motif Truntum", options: { Motif: "Truntum" }, price: 450000, stock: 3, weightGram: 150 }],
      },
    ],
  },
  {
    owner: { email: "gadgetkita@shopia.id", name: "Andi Pratama" },
    store: { name: "Gadget Kita", city: "Jakarta", description: "Elektronik original bergaransi resmi untuk pelajar dan pekerja." },
    products: [
      {
        name: "Laptop Pelajar 14\" Ryzen 5 RAM 16GB SSD 512GB",
        category: "elektronik",
        description: "Laptop ringan 1,4 kg untuk kuliah dan kerja. Layar 14 inci Full HD IPS, baterai hingga 10 jam, garansi resmi 2 tahun.",
        attributes: { Prosesor: "AMD Ryzen 5 7530U", RAM: "16 GB", Penyimpanan: "SSD 512 GB", Layar: "14 inci FHD IPS", Berat: "1,4 kg", Baterai: "± 10 jam", Garansi: "2 tahun resmi" },
        tags: ["laptop", "mahasiswa", "kuliah", "kerja", "ryzen"],
        variants: [{ name: "Silver", options: { Warna: "Silver" }, price: 6899000, compareAtPrice: 7499000, stock: 7, weightGram: 2200 }, { name: "Abu-abu", options: { Warna: "Abu-abu" }, price: 6899000, compareAtPrice: 7499000, stock: 4, weightGram: 2200 }],
      },
      {
        name: "Laptop Tipis 13\" Intel Core i5 RAM 8GB SSD 256GB",
        category: "elektronik",
        description: "Laptop tipis untuk mengetik, presentasi, dan belajar online. Bodi aluminium dengan keyboard backlit.",
        attributes: { Prosesor: "Intel Core i5-1235U", RAM: "8 GB", Penyimpanan: "SSD 256 GB", Layar: "13,3 inci FHD", Berat: "1,2 kg", Garansi: "1 tahun resmi" },
        tags: ["laptop", "tipis", "kuliah", "kantor"],
        variants: [{ name: "Standar", price: 7350000, stock: 3, weightGram: 2000 }],
      },
      {
        name: "TWS Earbuds Bluetooth 5.3 ANC",
        category: "elektronik",
        description: "Earbuds nirkabel dengan Active Noise Cancelling, baterai total 30 jam, mode latensi rendah untuk gaming, dan tahan cipratan IPX5.",
        attributes: { Bluetooth: "5.3", ANC: "Ya", Baterai: "8 jam (30 jam dengan case)", "Tahan air": "IPX5", Garansi: "1 tahun" },
        tags: ["earbuds", "tws", "headset", "musik", "gaming"],
        variants: [{ name: "Hitam", options: { Warna: "Hitam" }, price: 329000, compareAtPrice: 499000, stock: 40, weightGram: 200 }, { name: "Putih", options: { Warna: "Putih" }, price: 329000, compareAtPrice: 499000, stock: 25, weightGram: 200 }],
      },
      {
        name: "Power Bank 20.000mAh PD 22,5W",
        category: "elektronik",
        description: "Power bank 20.000mAh dengan pengisian cepat PD 22,5W dan layar persentase. Bisa mengisi 3 perangkat sekaligus.",
        attributes: { Kapasitas: "20.000 mAh", Output: "PD 22,5W", Port: "2x USB-A, 1x USB-C", Berat: "380 g" },
        tags: ["powerbank", "charger", "traveling"],
        variants: [{ name: "Hitam", options: { Warna: "Hitam" }, price: 219000, compareAtPrice: 289000, stock: 60, weightGram: 450 }],
      },
      {
        name: "Mouse Wireless Silent Ergonomis",
        category: "elektronik",
        description: "Mouse nirkabel dengan klik senyap dan bentuk ergonomis untuk pemakaian lama. Baterai AA tahan hingga 12 bulan.",
        attributes: { Koneksi: "USB receiver 2,4 GHz", DPI: "800–1600", Baterai: "1x AA (± 12 bulan)" },
        tags: ["mouse", "laptop", "kantor", "kuliah"],
        variants: [{ name: "Hitam", options: { Warna: "Hitam" }, price: 89000, stock: 80, weightGram: 120 }, { name: "Hijau Mint", options: { Warna: "Hijau Mint" }, price: 89000, stock: 30, weightGram: 120 }],
      },
    ],
  },
  {
    owner: { email: "langkahlokal@shopia.id", name: "Budi Santoso" },
    store: { name: "Langkah Lokal", city: "Bandung", description: "Sepatu & tas buatan pengrajin Cibaduyut." },
    products: [
      {
        name: "Sepatu Lari Ringan Breathable",
        category: "sepatu",
        description: "Sepatu lari ringan dengan upper mesh yang bernapas dan midsole empuk. Cocok untuk jogging harian hingga 10 km.",
        attributes: { Upper: "Mesh", Midsole: "EVA empuk", Berat: "± 240 g per sepatu", Penggunaan: "Jogging & lari jalan raya" },
        tags: ["sepatu lari", "running", "olahraga", "jogging"],
        variants: grid(["Hitam", "Hijau Emerald"], ["39", "40", "41", "42", "43"], 389000, 459000, 6, 800),
      },
      {
        name: "Sneakers Kulit Putih Klasik",
        category: "sepatu",
        description: "Sneakers kulit sintetis premium buatan Cibaduyut. Sol karet anti-slip, mudah dibersihkan, cocok untuk semua outfit.",
        attributes: { Bahan: "Kulit sintetis premium", Sol: "Karet anti-slip", Asal: "Cibaduyut, Bandung" },
        tags: ["sneakers", "putih", "casual", "kuliah"],
        variants: grid(["Putih"], ["38", "39", "40", "41", "42", "43"], 279000, 399000, 8, 900),
      },
      {
        name: "Tas Kerja Kulit Muat Laptop 14 Inci",
        category: "tas-aksesoris",
        description: "Tas kerja berbahan kulit sintetis dengan kompartemen laptop berbusa hingga 14 inci. Tampilan profesional dengan tali selempang yang bisa dilepas.",
        attributes: { Bahan: "Kulit sintetis (PU)", "Muat laptop": "Hingga 14 inci", Ukuran: "38 x 28 x 8 cm", Kompartemen: "3 ruang + slot laptop berbusa" },
        tags: ["tas kerja", "tas laptop", "kantor", "profesional", "hitam"],
        variants: [{ name: "Hitam", options: { Warna: "Hitam" }, price: 349000, compareAtPrice: 429000, stock: 10, weightGram: 900 }, { name: "Coklat", options: { Warna: "Coklat" }, price: 349000, compareAtPrice: 429000, stock: 6, weightGram: 900 }],
      },
      {
        name: "Ransel Kanvas Harian",
        category: "tas-aksesoris",
        description: "Ransel kanvas tebal tahan air ringan dengan slot laptop 15,6 inci. Cocok untuk kuliah dan traveling.",
        attributes: { Bahan: "Kanvas 16 oz", "Muat laptop": "Hingga 15,6 inci", Kapasitas: "22 liter" },
        tags: ["ransel", "tas laptop", "kuliah", "traveling"],
        variants: [{ name: "Navy", options: { Warna: "Navy" }, price: 259000, stock: 15, weightGram: 800 }, { name: "Olive", options: { Warna: "Olive" }, price: 259000, stock: 9, weightGram: 800 }],
      },
    ],
  },
  {
    owner: { email: "kulitsehat@shopia.id", name: "Maya Lestari" },
    store: { name: "Kulit Sehat Naturals", city: "Yogyakarta", description: "Perawatan kulit lokal ber-BPOM dengan bahan alami." },
    products: [
      {
        name: "Serum Niacinamide 10% + Zinc",
        category: "kecantikan",
        description: "Serum untuk membantu menyamarkan bekas jerawat dan mengontrol minyak. Tekstur ringan, cepat meresap.",
        attributes: { Volume: "20 ml", "Kandungan utama": "Niacinamide 10%, Zinc 1%", "Jenis kulit": "Berminyak & berjerawat", BPOM: "Terdaftar" },
        tags: ["serum", "skincare", "jerawat", "niacinamide"],
        variants: [{ name: "20 ml", options: { Ukuran: "20 ml" }, price: 79000, compareAtPrice: 120000, stock: 120, weightGram: 80 }, { name: "50 ml", options: { Ukuran: "50 ml" }, price: 159000, compareAtPrice: 220000, stock: 50, weightGram: 150 }],
      },
      {
        name: "Paket Hampers Perawatan Wajah untuk Ibu",
        category: "kecantikan",
        description: "Hampers berisi pembersih wajah, toner, krim malam, dan sheet mask dalam kotak kado. Cocok untuk ulang tahun atau Hari Ibu.",
        attributes: { Isi: "Facial wash, toner, night cream, 3 sheet mask", Kemasan: "Kotak kado + kartu ucapan", BPOM: "Terdaftar" },
        tags: ["hampers", "hadiah", "hadiah ibu", "ulang tahun", "skincare"],
        variants: [{ name: "Standar", price: 249000, compareAtPrice: 310000, stock: 20, weightGram: 700 }],
      },
      {
        name: "Sunscreen Gel SPF 50 PA++++",
        category: "kecantikan",
        description: "Sunscreen gel ringan tanpa whitecast, nyaman dipakai sehari-hari di iklim tropis.",
        attributes: { Volume: "50 ml", Perlindungan: "SPF 50 PA++++", Tekstur: "Gel ringan", BPOM: "Terdaftar" },
        tags: ["sunscreen", "skincare", "spf"],
        variants: [{ name: "50 ml", price: 65000, stock: 200, weightGram: 90 }],
      },
    ],
  },
  {
    owner: { email: "dapurnusantara@shopia.id", name: "Ibu Ratna" },
    store: { name: "Dapur Nusantara", city: "Malang", description: "Camilan khas dan perlengkapan dapur dari UMKM Jawa Timur." },
    products: [
      {
        name: "Keripik Tempe Pedas Khas Malang",
        category: "makanan-minuman",
        description: "Keripik tempe renyah dengan bumbu pedas gurih, tanpa pengawet. Diproduksi harian oleh UMKM di Malang.",
        attributes: { Berat: "250 g", Halal: "Ya (MUI)", "Masa simpan": "3 bulan", Pengawet: "Tanpa pengawet" },
        tags: ["keripik", "camilan", "oleh-oleh", "pedas"],
        variants: [{ name: "250 g", options: { Berat: "250 g" }, price: 25000, stock: 300, weightGram: 300 }, { name: "500 g", options: { Berat: "500 g" }, price: 45000, stock: 150, weightGram: 550 }],
      },
      {
        name: "Kopi Arabika Gayo 200g (Biji/Bubuk)",
        category: "makanan-minuman",
        description: "Kopi arabika Gayo single origin, sangrai medium. Aroma rempah dan cokelat dengan keasaman lembut.",
        attributes: { Asal: "Gayo, Aceh", Sangrai: "Medium", Berat: "200 g", Proses: "Full wash" },
        tags: ["kopi", "arabika", "hadiah", "oleh-oleh"],
        variants: [{ name: "Biji", options: { Bentuk: "Biji" }, price: 85000, stock: 40, weightGram: 250 }, { name: "Bubuk", options: { Bentuk: "Bubuk" }, price: 85000, stock: 35, weightGram: 250 }],
      },
      {
        name: "Tumbler Stainless 1 Liter Double Wall",
        category: "rumah-dapur",
        description: "Tumbler stainless double wall: dingin 24 jam, panas 12 jam. Dilengkapi sedotan dan pegangan.",
        attributes: { Kapasitas: "1 liter", Bahan: "Stainless steel 304", "Tahan dingin": "24 jam", "Tahan panas": "12 jam" },
        tags: ["tumbler", "botol minum", "hadiah", "kantor"],
        variants: [{ name: "Hijau Emerald", options: { Warna: "Hijau Emerald" }, price: 89000, compareAtPrice: 139000, stock: 70, weightGram: 500 }, { name: "Krem", options: { Warna: "Krem" }, price: 89000, compareAtPrice: 139000, stock: 45, weightGram: 500 }],
      },
      {
        name: "Set Pisau Dapur Stainless 5 pcs",
        category: "rumah-dapur",
        description: "Set 5 pisau dapur anti karat dengan stand kayu. Tajam dan gagangnya ergonomis.",
        attributes: { Isi: "5 pisau + stand kayu", Bahan: "Stainless steel" },
        tags: ["pisau", "dapur", "masak"],
        variants: [{ name: "Standar", price: 159000, compareAtPrice: 229000, stock: 25, weightGram: 1200 }],
      },
    ],
  },
];

const VOUCHERS = [
  { code: "SHOPIABARU", description: "Diskon 15% untuk pengguna baru (maks. Rp50.000)", type: VoucherType.PERCENT, value: 15, minSpend: 100000, maxDiscount: 50000 },
  { code: "HEMAT20K", description: "Potongan Rp20.000 min. belanja Rp150.000", type: VoucherType.FIXED, value: 20000, minSpend: 150000 },
  { code: "GRATISONGKIR", description: "Gratis ongkir (maks. Rp30.000) min. belanja Rp75.000", type: VoucherType.FREE_SHIPPING, value: 0, minSpend: 75000, maxDiscount: 30000 },
];

// Ulasan contoh: [nama produk (awal), rating, komentar]
const REVIEWS: [string, number, string][] = [
  ["Laptop Pelajar", 5, "Ringan dan cepat untuk kuliah. Baterai awet seharian."],
  ["Sepatu Lari", 5, "Empuk, ukuran pas. Dipakai lari 5 km nyaman."],
  ["TWS Earbuds", 4, "ANC bekerja baik, suara jernih. Mic agak kecil saat telepon."],
  ["Serum Niacinamide", 5, "Bekas jerawat memudar dalam 3 minggu."],
  ["Tas Kerja Kulit", 5, "Laptop 14 inci masuk pas, terlihat profesional."],
  ["Kemeja Batik Pria", 4, "Bahan adem, warna sesuai foto. Ukuran sedikit besar."],
  ["Keripik Tempe", 5, "Renyah dan pedasnya pas!"],
  ["Paket Hampers", 5, "Ibu senang sekali, kemasannya rapi."],
];

async function reset() {
  // Urutan hapus mengikuti relasi
  await prisma.$transaction([
    prisma.review.deleteMany(),
    prisma.paymentEvent.deleteMany(),
    prisma.orderEvent.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.productView.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.store.deleteMany(),
    prisma.category.deleteMany(),
    prisma.voucher.deleteMany(),
    prisma.address.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.aiInteraction.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  await reset();

  const categories = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await prisma.category.create({ data: { ...c, sortOrder: i } });
    categories.set(c.slug, row.id);
  }

  const now = new Date();
  await prisma.user.create({ data: { email: "admin@shopia.id", name: "Admin Shopia", roles: [Role.BUYER, Role.ADMIN], emailVerified: now } });
  const buyer = await prisma.user.create({ data: { email: "pembeli@shopia.id", name: "Rina Pembeli", roles: [Role.BUYER], emailVerified: now } });
  const address = await prisma.address.create({
    data: { userId: buyer.id, label: "Rumah", recipientName: "Rina", phone: "081234567890", line1: "Jl. Melati No. 5, RT 02/RW 03", city: "Bandung", province: "Jawa Barat", postalCode: "40111", isDefault: true },
  });

  const variantsByProductName = new Map<string, { productId: string; storeId: string; variant: { id: string; name: string; price: number } }>();
  let day = 0;
  for (const s of STORES) {
    const owner = await prisma.user.create({ data: { ...s.owner, roles: [Role.BUYER, Role.SELLER], emailVerified: now } });
    const store = await prisma.store.create({
      data: { ...s.store, slug: slugify(s.store.name), ownerId: owner.id, status: StoreStatus.ACTIVE, isUmkm: true },
    });
    for (const p of s.products) {
      const createdAt = new Date(now.getTime() - (day++ * 3 + 1) * 864e5);
      const product = await prisma.product.create({
        data: {
          storeId: store.id,
          categoryId: categories.get(p.category)!,
          name: p.name,
          slug: slugify(p.name),
          description: p.description,
          attributes: p.attributes,
          tags: p.tags,
          status: ProductStatus.ACTIVE,
          createdAt,
          variants: {
            create: p.variants.map((v) => ({
              name: v.name,
              options: v.options ?? {},
              price: v.price,
              compareAtPrice: v.compareAtPrice,
              stock: v.stock,
              weightGram: v.weightGram ?? 500,
            })),
          },
        },
        include: { variants: true },
      });
      for (const v of product.variants) {
        await prisma.inventoryMovement.create({ data: { variantId: v.id, delta: v.stock, reason: "INITIAL", actorId: owner.id } });
      }
      variantsByProductName.set(p.name, { productId: product.id, storeId: store.id, variant: product.variants[0] });
    }
  }

  // Pesanan selesai milik pembeli demo -> dasar ulasan terverifikasi
  for (const [i, [prefix, rating, comment]] of REVIEWS.entries()) {
    const entry = [...variantsByProductName.entries()].find(([name]) => name.startsWith(prefix));
    if (!entry) continue;
    const [productName, { productId, storeId, variant }] = entry;
    const createdAt = new Date(now.getTime() - (30 - i) * 864e5);
    const shippingCost = 15000;
    const payment = await prisma.payment.create({
      data: {
        userId: buyer.id, provider: "seed", providerOrderId: `SEED-${i + 1}`, amount: variant.price + shippingCost,
        status: "PAID", paidAt: createdAt, expiresAt: createdAt, createdAt,
      },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `SHP-SEED-${String(i + 1).padStart(4, "0")}`,
        buyerId: buyer.id, storeId, paymentId: payment.id, status: "COMPLETED", payoutStatus: "PAID_OUT",
        addressSnapshot: { recipientName: address.recipientName, phone: address.phone, line1: address.line1, city: address.city, province: address.province, postalCode: address.postalCode },
        subtotal: variant.price, shippingCost, discount: 0, total: variant.price + shippingCost, createdAt,
        items: { create: { productId, variantId: variant.id, productName, variantName: variant.name, unitPrice: variant.price, quantity: 1, lineTotal: variant.price } },
        shipment: { create: { courier: "JNE", service: "REG", cost: shippingCost, status: "DELIVERED", trackingNumber: `JNE${100000 + i}`, shippedAt: createdAt, deliveredAt: createdAt } },
        events: { create: [{ status: "PAID", createdAt }, { status: "COMPLETED", createdAt }] },
      },
      include: { items: true },
    });
    await prisma.review.create({ data: { productId, orderItemId: order.items[0].id, userId: buyer.id, rating, comment, createdAt } });
  }

  // Hitung ulang rating & jumlah terjual dari data nyata
  const products = await prisma.product.findMany({ select: { id: true } });
  for (const { id } of products) {
    const agg = await prisma.review.aggregate({ where: { productId: id, status: "PUBLISHED" }, _avg: { rating: true }, _count: true });
    const sold = await prisma.orderItem.aggregate({ where: { productId: id, order: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"] } } }, _sum: { quantity: true } });
    const v = await prisma.productVariant.aggregate({ where: { productId: id, isActive: true }, _min: { price: true }, _sum: { stock: true } });
    await prisma.product.update({
      where: { id },
      data: {
        ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        ratingCount: agg._count,
        soldCount: sold._sum.quantity ?? 0,
        minPrice: v._min.price ?? 0,
        totalStock: v._sum.stock ?? 0,
      },
    });
  }

  for (const v of VOUCHERS) await prisma.voucher.create({ data: v });

  const counts = {
    kategori: await prisma.category.count(),
    toko: await prisma.store.count(),
    produk: await prisma.product.count(),
    varian: await prisma.productVariant.count(),
    ulasan: await prisma.review.count(),
    voucher: await prisma.voucher.count(),
  };
  console.log("Seed selesai:", counts);
  console.log("Akun demo: admin@shopia.id (admin), pembeli@shopia.id (pembeli), rumahbatik@shopia.id (penjual)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
