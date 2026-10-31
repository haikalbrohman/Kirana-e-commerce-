/* =====================================================================
   KIRANA AI - ASISTEN BELANJA PINTAR
   ---------------------------------------------------------------------
   Fitur AI yang tersedia:
   1. Pencarian bahasa sehari-hari  -> "sepatu putih di bawah 300rb"
   2. Chat asisten belanja          -> tanya ongkir, voucher, rekomendasi
   3. Rekomendasi personal          -> berdasarkan produk yang dilihat
   4. Ringkasan ulasan otomatis     -> di halaman detail produk

   Dua mode:
   - AI LOKAL (default): berjalan langsung di browser, tanpa server
     dan tanpa biaya. Cocok untuk demo dan hosting statis.
   - AI CLAUDE: isi CONFIG.aiEndpoint (mis. "/api/chat") dan deploy
     folder /api ke Vercel. Jika server gagal, otomatis kembali ke AI lokal.
   ===================================================================== */

const ShopiaAI = (() => {
  /* ---------- Kamus kata kunci ---------- */
  // Sinonim kategori: kata yang diketik pengguna -> id kategori
  const CATEGORY_WORDS = {
    "fashion-wanita": ["wanita", "cewek", "perempuan", "dress", "gaun", "rok", "blouse"],
    "fashion-pria": ["pria", "cowok", "laki", "kaos", "hoodie", "celana", "chino", "jaket"],
    sepatu: ["sepatu", "sneakers", "sandal", "alas kaki"],
    elektronik: ["elektronik", "gadget", "earbuds", "headset", "earphone", "smartwatch", "jam", "powerbank", "charger", "hp"],
    kecantikan: ["skincare", "serum", "makeup", "kosmetik", "lipstik", "lip", "wajah", "kecantikan"],
    rumah: ["rumah", "dapur", "tumbler", "botol", "pisau", "masak"],
    umkm: ["umkm", "lokal", "handmade", "oleh-oleh", "camilan", "keripik", "snack", "makanan"],
  };

  const COLORS = ["putih", "hitam", "navy", "abu", "pink", "ungu", "lilac", "krem", "biru", "kuning", "hijau", "sage", "khaki", "coklat", "silver", "merah"];

  // Kata yang tidak penting untuk pencarian
  const STOPWORDS = new Set(
    "yang dan atau di ke dari untuk buat dengan aku saya mau cari carikan ada ga gak nggak tolong dong ya kak min bawah atas harga rp ribu rb k jt juta budget max maks maksimal minimal min kurang lebih sampai murah termurah terlaris laris terbaru baru bagus terbaik rekomendasi rating bintang yg utk bisa punya".split(" ")
  );

  /* ---------- Ubah teks harga jadi angka ---------- */
  // "300rb" -> 300000, "1,5jt" -> 1500000, "250 ribu" -> 250000, "200k" -> 200000
  function parseAmount(numStr, unit = "") {
    let n = parseFloat(numStr.replace(/\./g, "").replace(",", "."));
    if (isNaN(n)) return null;
    unit = unit.toLowerCase();
    if (/^(jt|juta)/.test(unit)) n *= 1000000;
    else if (/^(rb|ribu|k)/.test(unit)) n *= 1000;
    else if (n < 1000) n *= 1000; // "di bawah 300" diasumsikan 300 ribu
    return Math.round(n);
  }

  /* ---------- 1. Memahami kalimat pencarian ---------- */
  // Mengembalikan filter: { keywords, category, color, maxPrice, minPrice, minRating, sort }
  function parseQuery(text) {
    const t = (text || "").toLowerCase();
    const f = { keywords: [], category: null, color: null, maxPrice: null, minPrice: null, minRating: null, sort: null };
    const amt = "(\\d+(?:[.,]\\d+)?)\\s*(jt|juta|rb|ribu|k)?";

    let m = t.match(new RegExp("(?:di ?bawah|kurang dari|maks(?:imal)?|max|budget|<|sampai|gak lebih dari|ga lebih dari)\\s*(?:rp\\.?\\s*)?" + amt));
    if (m) f.maxPrice = parseAmount(m[1], m[2]);
    m = t.match(new RegExp("(?:di ?atas|lebih dari|minimal|min|>)\\s*(?:rp\\.?\\s*)?" + amt));
    if (m) f.minPrice = parseAmount(m[1], m[2]);
    m = t.match(new RegExp(amt + "\\s*(?:-|sampai|s/d|hingga)\\s*" + amt));
    if (m) {
      f.minPrice = parseAmount(m[1], m[2] || m[4]);
      f.maxPrice = parseAmount(m[3], m[4]);
    }
    m = t.match(/rating\s*(\d(?:[.,]\d)?)|bintang\s*(\d(?:[.,]\d)?)/);
    if (m) f.minRating = parseFloat((m[1] || m[2]).replace(",", "."));

    if (/termurah|paling murah|murah/.test(t)) f.sort = "termurah";
    if (/terlaris|paling laris|best ?seller|populer/.test(t)) f.sort = "terlaris";
    if (/terbaru|paling baru|new/.test(t)) f.sort = "terbaru";
    if (/terbaik|rating tinggi|paling bagus/.test(t)) f.sort = "rating";

    for (const [cat, words] of Object.entries(CATEGORY_WORDS)) {
      if (words.some((w) => new RegExp("\\b" + w + "\\b").test(t))) {
        f.category = cat;
        break;
      }
    }
    f.color = COLORS.find((c) => new RegExp("\\b" + c + "\\b").test(t)) || null;

    // Kata kunci sisa (tanpa angka & kata umum)
    f.keywords = t
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d/.test(w) && w !== f.color);
    return f;
  }

  /* ---------- Skor kecocokan produk ---------- */
  // kw  = skor dari kata kunci saja; total = kw + bonus kategori & warna
  function scoreProduct(p, f) {
    const hay = [p.name, p.description, p.tags.join(" "), (CATEGORIES.find((c) => c.id === p.category) || {}).name || ""]
      .join(" ")
      .toLowerCase();
    let kw = 0;
    for (const w of f.keywords) {
      // Cocokkan di awal kata, agar "tas" tidak cocok dengan "kualitas"
      const re = new RegExp("(^|[^a-z0-9])" + w.replace(/[^a-z0-9]/g, "\\$&"));
      if (re.test(p.name.toLowerCase())) kw += 3;
      else if (p.tags.some((tag) => tag.startsWith(w))) kw += 2;
      else if (re.test(hay)) kw += 1;
    }
    let bonus = 0;
    if (f.category && p.category === f.category) bonus += 2;
    if (f.color) {
      const colors = ((p.variants && p.variants.warna) || []).join(" ").toLowerCase();
      if (colors.includes(f.color) || hay.includes(f.color)) bonus += 2;
    }
    return { kw, total: kw + bonus };
  }

  /* ---------- Cari produk dari kalimat bebas ---------- */
  function search(text, limit = 50) {
    const f = parseQuery(text);
    let list = PRODUCTS.filter((p) => {
      if (f.maxPrice && p.price > f.maxPrice) return false;
      if (f.minPrice && p.price < f.minPrice) return false;
      if (f.minRating && p.rating < f.minRating) return false;
      return true;
    }).map((p) => {
      const sc = scoreProduct(p, f);
      return { p, s: sc.total, kw: sc.kw };
    });

    // Kategori terdeteksi: hanya kategori itu, kecuali nama produk cocok persis
    if (f.category) list = list.filter((x) => x.p.category === f.category || x.kw >= 3);
    // Jika ada produk yang cocok dengan kata kunci, buang yang tidak cocok sama sekali
    if (list.some((x) => x.kw > 0)) list = list.filter((x) => x.kw > 0);
    // Warna diminta: jika ada produk dengan warna tsb, tampilkan itu saja
    const hasColor = (x) => [...((x.p.variants && x.p.variants.warna) || []), x.p.name].join(" ").toLowerCase().includes(f.color);
    if (f.color && list.some(hasColor)) list = list.filter(hasColor);
    // Jika ada kata kunci/kategori/warna, hanya tampilkan yang cocok
    const needsMatch = f.keywords.length || f.category || f.color;
    if (needsMatch) list = list.filter((x) => x.s > 0);

    const sorters = {
      termurah: (a, b) => a.p.price - b.p.price,
      terlaris: (a, b) => b.p.sold - a.p.sold,
      terbaru: (a, b) => b.p.createdAt.localeCompare(a.p.createdAt),
      rating: (a, b) => b.p.rating - a.p.rating,
    };
    list.sort(sorters[f.sort] || ((a, b) => b.s - a.s || b.p.sold - a.p.sold));
    return { filters: f, products: list.slice(0, limit).map((x) => x.p) };
  }

  /* ---------- 3. Rekomendasi personal ---------- */
  // Berdasarkan kategori & tag produk yang sering dilihat / ada di keranjang / wishlist
  function recommend(limit = 8, excludeId = null) {
    const s = Store.state;
    const seedIds = [...s.viewed.slice(0, 8), ...s.cart.map((i) => i.id), ...s.wishlist];
    if (!seedIds.length) {
      // Belum ada riwayat: tampilkan produk rating tinggi & laris
      return [...PRODUCTS].filter((p) => p.id !== excludeId).sort((a, b) => b.rating * Math.log(b.sold) - a.rating * Math.log(a.sold)).slice(0, limit);
    }
    const catWeight = {};
    const tagWeight = {};
    seedIds.forEach((id, idx) => {
      const p = Store.getProduct(id);
      if (!p) return;
      const w = 1 / (1 + idx * 0.2); // produk yang baru dilihat lebih berpengaruh
      catWeight[p.category] = (catWeight[p.category] || 0) + w * 3;
      p.tags.forEach((t) => (tagWeight[t] = (tagWeight[t] || 0) + w));
    });
    return PRODUCTS.filter((p) => p.id !== excludeId)
      .map((p) => {
        let sc = catWeight[p.category] || 0;
        p.tags.forEach((t) => (sc += tagWeight[t] || 0));
        sc += p.rating / 5; // sedikit bonus kualitas
        if (s.cart.some((i) => i.id === p.id)) sc -= 2; // yang sudah di keranjang dikurangi
        return { p, sc };
      })
      .sort((a, b) => b.sc - a.sc)
      .slice(0, limit)
      .map((x) => x.p);
  }

  // Produk mirip (untuk halaman detail)
  function similar(product, limit = 6) {
    return PRODUCTS.filter((p) => p.id !== product.id)
      .map((p) => {
        let sc = p.category === product.category ? 3 : 0;
        sc += p.tags.filter((t) => product.tags.includes(t)).length;
        return { p, sc };
      })
      .filter((x) => x.sc > 0)
      .sort((a, b) => b.sc - a.sc || b.p.sold - a.p.sold)
      .slice(0, limit)
      .map((x) => x.p);
  }

  /* ---------- 4. Ringkasan ulasan ---------- */
  const ASPECTS = {
    "Kualitas bahan": ["bahan", "kualitas", "awet", "tebal", "lembut", "adem", "tipis", "berbulu"],
    "Ukuran sesuai": ["ukuran", "pas", "size", "kecil", "besar", "chart"],
    "Pengiriman": ["pengiriman", "kirim", "cepat", "lama", "kardus", "sampai"],
    "Sesuai foto": ["foto", "warna", "persis", "beda"],
    "Harga worth it": ["murah", "worth", "harga", "mahal"],
    "Performa": ["baterai", "suara", "ngecas", "layar", "anc", "bass", "delay", "tajam", "tahan"],
  };
  const POSITIVE = ["bagus", "mantap", "suka", "cantik", "adem", "cepat", "pas", "awet", "empuk", "recommended", "worth", "keren", "juara", "rapi", "lembut", "jernih", "tajam", "nyaman", "ringan", "tahan"];
  const NEGATIVE = ["tipis", "kecil", "lama", "penyok", "beda", "kurang", "kering", "berbulu", "gelap", "sinkron", "agak"];

  function summarizeReviews(product) {
    const reviews = product.reviews || [];
    if (!reviews.length) return null;
    const pros = {};
    const cons = {};
    reviews.forEach((r) => {
      const t = r.text.toLowerCase();
      const isNeg = NEGATIVE.some((w) => t.includes(w)) || r.rating <= 3;
      for (const [aspect, words] of Object.entries(ASPECTS)) {
        if (words.some((w) => t.includes(w))) {
          // Kalimat yang mengandung kata negatif + aspek dianggap catatan/kekurangan
          const negHere = NEGATIVE.some((w) => t.includes(w)) && words.some((w) => t.includes(w)) && isNeg;
          if (negHere && r.rating < 5) cons[aspect] = (cons[aspect] || 0) + 1;
          else if (POSITIVE.some((w) => t.includes(w)) || r.rating >= 4) pros[aspect] = (pros[aspect] || 0) + 1;
        }
      }
    });
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const pct = Math.round((reviews.filter((r) => r.rating >= 4).length / reviews.length) * 100);
    const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map((x) => x[0]).slice(0, 3);
    const prosList = top(pros);
    const consList = top(cons).filter((c) => !prosList.includes(c) || cons[c] > pros[c]);
    let verdict;
    if (avg >= 4.6) verdict = "Sangat direkomendasikan pembeli";
    else if (avg >= 4) verdict = "Umumnya pembeli puas";
    else verdict = "Ulasan beragam, cek detail sebelum membeli";
    return { avg, pct, pros: prosList, cons: consList, verdict };
  }

  /* ---------- 2. Chat asisten ---------- */
  const fmt = (n) => formatRupiah(n);

  // Jawaban AI lokal berdasarkan niat (intent) pertanyaan
  function localReply(message) {
    const t = message.toLowerCase();

    if (/^(halo|hai|hi|hello|pagi|siang|sore|malam|assalam)/.test(t))
      return { text: `Halo! 👋 Aku Kirana AI. Ceritakan saja barang yang kamu cari, misalnya "hadiah untuk pacar di bawah 200rb" atau "skincare untuk bekas jerawat".`, products: [] };

    if (/ongkir|ongkos kirim|pengiriman|kurir|berapa lama|sampai kapan/.test(t))
      return {
        text:
          `Pilihan pengiriman di Kirana:\n` +
          SHIPPING.map((s) => `• ${s.name}: ${fmt(s.cost)} (${s.eta})`).join("\n") +
          `\n\nGratis ongkir Reguler untuk belanja min. ${fmt(CONFIG.freeShippingMin)} 🚚`,
        products: [],
      };

    if (/voucher|diskon|promo|kode|kupon|potongan/.test(t))
      return { text: `Voucher yang bisa kamu pakai sekarang:\n` + VOUCHERS.map((v) => `• ${v.code} - ${v.desc}`).join("\n") + `\n\nMasukkan kodenya di keranjang ya!`, products: [] };

    if (/bayar|pembayaran|cod|qris|transfer|gopay|ovo|dana/.test(t))
      return { text: `Metode pembayaran yang tersedia:\n` + PAYMENTS.map((p) => `• ${p.icon} ${p.name} - ${p.desc}`).join("\n"), products: [] };

    if (/retur|refund|tukar|kembalikan|garansi/.test(t))
      return { text: `Kamu bisa ajukan retur/tukar ukuran maksimal 7 hari setelah barang diterima (belum dipakai, label masih ada). Hubungi kami lewat tombol WhatsApp di pojok kanan bawah ya.`, products: [] };

    if (/pesanan|order|lacak|resi|status/.test(t)) {
      const orders = Store.myOrders();
      if (!orders.length) return { text: `Kamu belum punya pesanan. Yuk mulai belanja! 🛍️`, products: [] };
      const o = orders[0];
      return { text: `Pesanan terakhirmu ${o.id} (${new Date(o.date).toLocaleDateString("id-ID")}) berstatus "${o.status}", total ${fmt(o.total)}. Lihat detailnya di menu Akun → Riwayat Pesanan.`, products: [] };
    }

    if (/rekomendasi|saran|cocok|untuk aku|buat aku|recommend/.test(t) && !/\d/.test(t) && parseQuery(t).keywords.length <= 2) {
      const rec = recommend(4);
      return { text: `Ini pilihan yang menurutku cocok buat kamu, berdasarkan produk yang kamu lihat:`, products: rec };
    }

    if (/hadiah|kado|gift/.test(t)) {
      const f = parseQuery(t);
      let list = PRODUCTS.filter((p) => p.tags.includes("hadiah") || p.rating >= 4.8);
      if (f.maxPrice) list = list.filter((p) => p.price <= f.maxPrice);
      list = list.sort((a, b) => b.rating - a.rating).slice(0, 4);
      return {
        text: list.length ? `Ide kado yang banyak disukai${f.maxPrice ? ` dengan budget ${fmt(f.maxPrice)}` : ""}: 🎁` : `Belum ada kado yang pas dengan budget itu. Coba naikkan sedikit budgetnya ya.`,
        products: list,
      };
    }

    // Default: anggap sebagai pencarian produk
    const { filters, products } = search(t, 4);
    if (products.length) {
      const parts = [];
      if (filters.category) parts.push((CATEGORIES.find((c) => c.id === filters.category) || {}).name);
      if (filters.color) parts.push(`warna ${filters.color}`);
      if (filters.maxPrice) parts.push(`di bawah ${fmt(filters.maxPrice)}`);
      return { text: `Aku menemukan ${products.length} produk${parts.length ? " (" + parts.join(", ") + ")" : ""} yang cocok:`, products };
    }
    return {
      text: `Maaf, aku belum menemukan produk yang cocok 🙏 Coba kata lain, misalnya "kaos hitam", "earbuds untuk gaming", atau "skincare di bawah 100rb". Kamu juga bisa chat admin lewat WhatsApp.`,
      products: [],
    };
  }

  // Kirim ke server Claude (jika CONFIG.aiEndpoint diisi). Balasan boleh
  // menyebut produk dengan format [[p01]] yang akan diubah menjadi kartu produk.
  async function remoteReply(message, history) {
    const catalog = PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      rating: p.rating,
      sold: p.sold,
      stock: p.stock,
      variants: p.variants,
      tags: p.tags,
    }));
    const res = await fetch(CONFIG.aiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: history.slice(-10).map((m) => ({ role: m.role, content: m.text })),
        catalog,
        store: { vouchers: VOUCHERS, shipping: SHIPPING, payments: PAYMENTS, freeShippingMin: CONFIG.freeShippingMin },
      }),
    });
    if (!res.ok) throw new Error("AI server error " + res.status);
    const data = await res.json();
    const ids = [...new Set([...(data.reply || "").matchAll(/\[\[(\w+)\]\]/g)].map((m) => m[1]))];
    return {
      text: (data.reply || "").replace(/\s*\[\[\w+\]\]/g, "").trim(),
      products: ids.map((id) => Store.getProduct(id)).filter(Boolean).slice(0, 6),
    };
  }

  async function chat(message, history = []) {
    if (CONFIG.aiEndpoint) {
      try {
        return await remoteReply(message, history);
      } catch (e) {
        console.warn("Kirana AI: server tidak tersedia, memakai AI lokal.", e);
      }
    }
    // Jeda kecil agar terasa seperti sedang "berpikir"
    await new Promise((r) => setTimeout(r, 450));
    return localReply(message);
  }

  /* ---------- 5. Chat penjual (dibalas otomatis oleh AI) ---------- */
  // Seperti chat penjual di marketplace: pembeli bertanya tentang produk /
  // pesanan, AI menjawab atas nama toko dengan data produk yang sebenarnya.
  function sellerLocalReply(message, product, order) {
    const t = message.toLowerCase();
    const p = product;
    const list = (arr) => (arr || []).join(", ");

    if (/^(halo|hai|hi|permisi|pagi|siang|sore|malam|assalam|min|kak)\b/.test(t) && t.length < 20)
      return `Halo kak, selamat datang di Kirana Official Store 😊 ${p ? `Ada yang mau ditanyakan soal ${p.name}?` : "Ada yang bisa kami bantu?"}`;

    if (order && /pesanan|paket|kapan|sampai|resi|lacak|dikirim|status/.test(t))
      return `Pesanan ${order.id} sedang kami pantau ya kak 📦 Kakak bisa lihat posisi paket secara detail di menu "Lacak Pesanan". Kalau ada kendala, kabari kami di sini.`;

    if (p) {
      if (/stok|ready|ready ga|masih ada|tersedia|habis/.test(t))
        return p.stock > 0
          ? `Ready kak! Stok ${p.name} saat ini tinggal ${p.stock} pcs${p.stock < 30 ? ", termasuk cepat habis lho 🔥" : "."} Silakan langsung checkout ya.`
          : `Mohon maaf kak, ${p.name} sedang kosong. Kakak bisa simpan ke wishlist dulu, nanti kami restock 🙏`;
      if (/ukuran|size|muat|pas|lingkar|panjang|berat badan|bb|tb/.test(t))
        return p.variants && p.variants.ukuran && p.variants.ukuran.length
          ? `Ukuran yang tersedia: ${list(p.variants.ukuran)}. Kalau ragu, kami sarankan ambil satu ukuran lebih besar ya kak. Bisa tukar ukuran maks. 7 hari setelah barang diterima 👍`
          : `Produk ini tidak ada pilihan ukuran kak, satu ukuran untuk semua 😊`;
      if (/warna|color|varian|pilihan/.test(t))
        return p.variants && p.variants.warna && p.variants.warna.length
          ? `Pilihan warna: ${list(p.variants.warna)}. Warna paling laris biasanya ${p.variants.warna[0]} kak ✨`
          : `Produk ini hanya ada satu warna seperti di foto ya kak.`;
      if (/ori|asli|original|kw|palsu/.test(t))
        return `Dijamin 100% original kak 🛡️ Kalau tidak sesuai deskripsi, uang kembali penuh.`;
      if (/bahan|material|kualitas|tebal|awet|detail|spesifikasi|spek/.test(t))
        return `Info dari deskripsi produk: ${p.description}\n\nRating ${p.rating}/5 dari ${p.reviews.length} ulasan pembeli 😊`;
      if (/nego|kurang|diskon|murah|potong|promo|voucher/.test(t))
        return `Harga ${formatRupiah(p.price)} sudah harga terbaik kak 🙏 Tapi kakak bisa pakai voucher: ${VOUCHERS.slice(0, 2).map((v) => `${v.code} (${v.desc})`).join(" atau ")}.`;
    }

    if (/kirim|dikirim|hari ini|kapan|proses|lama|ongkir|kurir|cod/.test(t))
      return `Pesanan yang masuk sebelum jam 15.00 kami kirim di hari yang sama kak 🚚 Pilihan kurir: ${SHIPPING.map((s) => `${s.name} (${s.eta})`).join(", ")}. Gratis ongkir untuk belanja min. ${formatRupiah(CONFIG.freeShippingMin)}.`;
    if (/terima kasih|makasih|thanks|thx|oke|ok|siap/.test(t))
      return `Sama-sama kak, terima kasih sudah belanja di Kirana 💙 Jangan lupa kasih ulasan ya setelah barang sampai!`;
    return null; // tidak dikenali -> serahkan ke asisten belanja umum
  }

  async function sellerChat(message, { product = null, order = null, history = [] } = {}) {
    // Jika AI Claude aktif, kirim pertanyaan beserta konteks produk/pesanan
    if (CONFIG.aiEndpoint) {
      const ctx = product ? `tentang produk ${product.name} [[${product.id}]]` : order ? `tentang pesanan ${order.id}` : "";
      try {
        return await remoteReply(`[Pembeli chat ke penjual ${ctx}. Jawab ramah sebagai admin toko.] ${message}`, history);
      } catch (e) {
        console.warn("Kirana AI: server tidak tersedia, memakai AI lokal.", e);
      }
    }
    await new Promise((r) => setTimeout(r, 600));
    const text = sellerLocalReply(message, product, order);
    if (text) return { text, products: [] };
    return localReply(message);
  }

  return { parseQuery, search, recommend, similar, summarizeReviews, chat, sellerChat };
})();
