/**
 * Mesin aturan (tanpa model bahasa). Dipakai jika AI belum dikonfigurasi,
 * sedang gagal, atau melewati batas biaya. Tidak pernah mengarang data.
 */
import type { Sort } from '../catalog/catalog.dto.js';

export interface SearchFilters {
  keywords: string[];
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  sort: Sort | null;
}

// Sinonim kata -> slug kategori (kategori baru tetap dikenali lewat nama kategorinya)
const CATEGORY_WORDS: Record<string, string[]> = {
  'fashion-wanita': ['wanita', 'cewek', 'perempuan', 'dress', 'gaun', 'rok', 'blouse', 'gamis'],
  'fashion-pria': ['pria', 'cowok', 'laki', 'kemeja', 'kaos', 'hoodie', 'celana', 'jaket'],
  sepatu: ['sepatu', 'sneakers', 'sandal', 'running', 'lari'],
  'tas-aksesoris': ['tas', 'ransel', 'dompet', 'selendang', 'aksesoris', 'backpack'],
  elektronik: ['elektronik', 'gadget', 'laptop', 'notebook', 'earbuds', 'headset', 'earphone', 'powerbank', 'charger', 'mouse', 'hp'],
  kecantikan: ['skincare', 'serum', 'makeup', 'kosmetik', 'sunscreen', 'wajah', 'kecantikan', 'jerawat'],
  'rumah-dapur': ['rumah', 'dapur', 'tumbler', 'botol', 'pisau', 'masak'],
  'makanan-minuman': ['makanan', 'minuman', 'camilan', 'keripik', 'snack', 'kopi', 'oleh-oleh'],
};

function parseAmount(num: string, unit = ''): number | null {
  let n = parseFloat(num.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const u = unit.toLowerCase();
  if (/^(jt|juta)/.test(u)) n *= 1_000_000;
  else if (/^(rb|ribu|k)/.test(u)) n *= 1000;
  else if (n < 1000) n *= 1000; // "di bawah 300" = 300 ribu
  return Math.round(n);
}

/** Pahami kalimat pencarian bahasa Indonesia sehari-hari menjadi filter katalog. */
export function parseQueryRules(text: string, categories: { slug: string; name: string }[]): SearchFilters {
  const t = ` ${text.toLowerCase()} `;
  const f: SearchFilters = { keywords: [], category: null, minPrice: null, maxPrice: null, minRating: null, sort: null };
  const amt = '(?:rp\\.?\\s*)?(\\d+(?:[.,]\\d+)*)\\s*(jt|juta|rb|ribu|k)?\\b';

  let m = t.match(new RegExp(amt + '\\s*(?:-|sampai|s/d|hingga)\\s*' + amt));
  if (m) {
    f.minPrice = parseAmount(m[1], m[2] || m[4]);
    f.maxPrice = parseAmount(m[3], m[4]);
  } else {
    m = t.match(new RegExp('(?:di ?bawah|kurang dari|maks(?:imal)?|max|budget|anggaran|<|ga lebih dari|tidak lebih dari)\\s*' + amt));
    if (m) f.maxPrice = parseAmount(m[1], m[2]);
    m = t.match(new RegExp('(?:di ?atas|lebih dari|minimal|>)\\s*' + amt));
    if (m) f.minPrice = parseAmount(m[1], m[2]);
  }
  m = t.match(/(?:rating|bintang)\s*(\d(?:[.,]\d)?)/);
  if (m) f.minRating = Math.min(5, parseFloat(m[1].replace(',', '.')));

  if (/terbaik|rating tinggi|paling bagus|kualitas bagus|berkualitas/.test(t)) f.sort = 'rating';
  else if (/termurah|paling murah|harga terendah|terjangkau|hemat/.test(t)) f.sort = 'price_asc';
  else if (/terlaris|paling laris|best ?seller|populer/.test(t)) f.sort = 'popular';
  else if (/terbaru|paling baru/.test(t)) f.sort = 'newest';

  const known = new Set(categories.map((c) => c.slug));
  for (const [slug, words] of Object.entries(CATEGORY_WORDS)) {
    if (known.has(slug) && words.some((w) => new RegExp(`\\b${w}\\b`).test(t))) {
      f.category = slug;
      break;
    }
  }
  if (!f.category) {
    const c = categories.find((c) => t.includes(c.name.toLowerCase()));
    if (c) f.category = c.slug;
  }

  const STOP = new Set(
    'yang dan atau di ke dari untuk buat dengan saya aku mau cari carikan ingin tolong dong ya kak yg utk ada harga rp ribu rb jt juta budget anggaran bawah atas maks maksimal minimal murah termurah terlaris terbaru bagus terbaik kualitas tapi tetapi terjangkau produk barang yang cocok punya apa rekomendasi sekitar lebih kurang dari sampai hingga rating bintang muat terlihat mencari carikan harganya hemat berkualitas sama seperti beli membeli butuh perlu tolong bisa apakah'.split(' '),
  );
  f.keywords = t
    // Buang frasa harga (mis. "Rp500.000", "7 juta") agar tidak jadi kata kunci
    .replace(/rp\.?\s*\d[\d.,]*\s*(jt|juta|rb|ribu|k)?\b/g, ' ')
    .replace(/\b\d[\d.,]*\s*(jt|juta|rb|ribu|k)\b/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d/.test(w) && !['rb', 'jt', 'k'].includes(w))
    .slice(0, 6);
  return f;
}

export function describeFilters(f: SearchFilters, categoryName?: string) {
  const bits: string[] = [];
  if (f.keywords.length) bits.push(`kata kunci "${f.keywords.join(' ')}"`);
  if (categoryName) bits.push(`kategori ${categoryName}`);
  if (f.minPrice && f.maxPrice) bits.push(`harga Rp${f.minPrice.toLocaleString('id-ID')}–Rp${f.maxPrice.toLocaleString('id-ID')}`);
  else if (f.maxPrice) bits.push(`di bawah Rp${f.maxPrice.toLocaleString('id-ID')}`);
  else if (f.minPrice) bits.push(`di atas Rp${f.minPrice.toLocaleString('id-ID')}`);
  if (f.minRating) bits.push(`rating ≥ ${f.minRating}`);
  return bits;
}

/** Jawaban asisten berbasis aturan, hanya dari produk kandidat yang ada. */
export function assistantReplyRules(message: string, candidates: { id: string; name: string; price: number; ratingAvg: number }[], filters: SearchFilters) {
  const t = message.toLowerCase();
  if (/^(halo|hai|hi|hello|pagi|siang|sore|malam|assalam)/.test(t.trim()))
    return { reply: 'Halo! 👋 Aku Shopia AI. Ceritakan barang yang kamu cari, untuk siapa, dan budget-nya. Contoh: "sepatu lari di bawah 500 ribu".', productIds: [], followUp: null };
  if (/ongkir|pengiriman|kurir/.test(t))
    return { reply: 'Ongkir dihitung otomatis saat checkout berdasarkan berat barang dan kurir yang kamu pilih (Hemat, Reguler, atau Express).', productIds: [], followUp: null };
  if (/bayar|pembayaran|cod|qris|transfer/.test(t))
    return { reply: 'Pembayaran diproses aman lewat Midtrans (QRIS, e-wallet, virtual account bank, dan kartu). Pesanan baru diproses setelah pembayaran terkonfirmasi.', productIds: [], followUp: null };
  if (!candidates.length)
    return { reply: 'Maaf, aku belum menemukan produk yang cocok di katalog Shopia. Coba sebutkan jenis barang atau naikkan sedikit budget-nya ya.', productIds: [], followUp: 'Barang apa yang kamu cari, dan berapa budget-mu?' };
  const picks = candidates.slice(0, 4);
  const needsBudget = !filters.maxPrice && !filters.minPrice;
  return {
    reply: `Ini ${picks.length} pilihan dari katalog Shopia yang paling cocok dengan permintaanmu. Harga & stok di kartu produk selalu yang terbaru.`,
    productIds: picks.map((p) => p.id),
    followUp: needsBudget ? 'Kalau ada kisaran budget, sebutkan ya supaya pilihannya lebih pas.' : null,
  };
}
