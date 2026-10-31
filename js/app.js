/* =====================================================================
   KIRANA - APLIKASI UTAMA
   ---------------------------------------------------------------------
   Website satu halaman (SPA) dengan router berbasis hash (#/...):
     #/                 Beranda
     #/katalog          Katalog (filter, urutkan, pencarian AI)
     #/produk/:id       Detail produk
     #/keranjang        Keranjang
     #/checkout         Checkout
     #/sukses/:id       Pesanan berhasil
     #/akun             Masuk / daftar / profil
     #/pesanan          Riwayat pesanan
     #/wishlist         Wishlist
     #/tentang, #/kontak, #/faq
   ===================================================================== */

const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");

/* =====================================================================
   FUNGSI BANTU
   ===================================================================== */

// Amankan teks dari input pengguna sebelum dimasukkan ke HTML
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const discountPct = (p) => (p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0);
const categoryName = (id) => (CATEGORIES.find((c) => c.id === id) || {}).name || id;
const formatSold = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(".", ",").replace(",0", "") + "rb" : String(n));
const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));

// Ulasan produk = ulasan dari pembeli di HP ini (paling atas) + ulasan bawaan
function reviewsOf(p) {
  const mine = Store.state.myReviews.filter((r) => r.productId === p.id).map((r) => ({ ...r, mine: true }));
  return [...mine, ...(p.reviews || [])];
}

// Gambar produk: pakai foto jika ada, jika tidak tampilkan ilustrasi emoji
function thumb(p, idx = 0) {
  const img = p.images && p.images.length ? p.images[idx % p.images.length] : null;
  if (img) return `<img class="thumb-img" src="${esc(Admin.imgSrc(img))}" alt="${esc(p.name)}" loading="lazy" />`;
  const angles = [135, 45, 200, 300];
  const transforms = ["none", "rotate(-12deg) scale(.9)", "scale(1.15)", "rotate(10deg)"];
  const [c1, c2] = p.color || ["#ede9fe", "#c4b5fd"];
  return `<div class="ph" style="background:linear-gradient(${angles[idx % 4]}deg,${c1},${c2})"><span style="transform:${transforms[idx % 4]}">${p.emoji || "🛍️"}</span></div>`;
}

// Jumlah "foto" di galeri (foto asli atau 4 variasi ilustrasi)
const galleryCount = (p) => (p.images && p.images.length ? p.images.length : 4);

// Ambil path & parameter dari hash URL
function parseHash() {
  const hash = location.hash.slice(1) || "/";
  const [path, qs] = hash.split("?");
  return { path: path || "/", params: new URLSearchParams(qs || "") };
}

// Pindah halaman. replace=true tidak menambah riwayat (untuk filter)
function go(path, replace = false) {
  if (replace) {
    history.replaceState(null, "", "#" + path);
    render(false);
  } else location.hash = path;
}

// Link WhatsApp dengan pesan otomatis
const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

/* ---------- Notifikasi (toast) ---------- */
function toast(message, { icon = "✅", link = null, linkText = "Lihat" } = {}) {
  const wrap = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span class="t-ico">${icon}</span><span class="t-body">${message}</span>${link ? `<a href="${link}">${linkText}</a>` : ""}`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

/* ---------- Badge keranjang & wishlist ---------- */
function updateBadges() {
  const n = Store.cartCount();
  ["cart-badge", "cart-badge-2"].forEach((id) => {
    const b = document.getElementById(id);
    b.textContent = n > 99 ? "99+" : n || "";
    b.dataset.count = n;
  });
  const w = document.getElementById("wish-badge");
  w.textContent = Store.state.wishlist.length || "";
  w.dataset.count = Store.state.wishlist.length;
}
Store.subscribe(updateBadges);

function bumpCart() {
  const icon = document.getElementById("cart-icon");
  icon.classList.remove("cart-bump");
  void icon.offsetWidth; // paksa ulang animasi
  icon.classList.add("cart-bump");
}

/* ---------- Tambah ke keranjang (dipakai di banyak tempat) ---------- */
function addToCart(id, variant = {}, qty = 1) {
  const p = Store.getProduct(id);
  if (!p || p.stock <= 0) return toast("Maaf, stok habis", { icon: "😢" });
  Store.addToCart(id, variant, qty);
  bumpCart();
  const v = [variant.ukuran, variant.warna].filter(Boolean).join(", ");
  toast(`<b>Ditambahkan ke keranjang</b><br><span class="small">${esc(p.name)}${v ? " · " + esc(v) : ""}</span>`, { icon: "🛒", link: "#/keranjang" });
}

// Cek apakah produk punya varian yang harus dipilih
const variantKeys = (p) => Object.keys(p.variants || {}).filter((k) => (p.variants[k] || []).length);

/* =====================================================================
   KOMPONEN
   ===================================================================== */

// Pilihan pendek (S/M/L/XL, 39/40) tampil sebagai pil lime bersegmen
const isCompact = (values) => values.every((v) => String(v).length <= 4);

function productCard(p, { compact = false } = {}) {
  const d = discountPct(p);
  const wished = Store.inWishlist(p.id);
  return `
  <div class="product-card">
    <a href="#/produk/${p.id}" class="thumb">
      ${thumb(p)}
      ${d ? `<span class="disc-tag">-${d}%</span>` : ""}
    </a>
    ${compact ? "" : `<button class="wish-btn" data-action="wish" data-id="${p.id}" aria-label="Wishlist">${wished ? "💜" : "🤍"}</button>`}
    <a href="#/produk/${p.id}" class="info">
      <div class="name">${esc(p.name)}</div>
      <div class="price">${formatRupiah(p.price)}${d && !compact ? `<span class="price-old">${formatRupiah(p.originalPrice)}</span>` : ""}</div>
      <div class="meta">${p.rating > 0 ? `<span class="star">★</span>${p.rating} · ` : `<span class="pill pill-primary" style="padding:1px 6px">Baru</span>`}${p.sold ? formatSold(p.sold) + " terjual" : ""}</div>
    </a>
    ${compact ? "" : `<button class="quick-add" data-action="quick-add" data-id="${p.id}" aria-label="Tambah ke keranjang">+</button>`}
  </div>`;
}

const grid = (list, cls = "") => `<div class="grid ${cls}">${list.map((p) => productCard(p)).join("")}</div>`;

function emptyState(icon, title, text, btn = "", link = "#/katalog") {
  return `<div class="empty"><div class="big">${icon}</div><h3>${title}</h3><p class="muted">${text}</p>${btn ? `<a href="${link}" class="btn btn-primary">${btn}</a>` : ""}</div>`;
}

/* =====================================================================
   HALAMAN: BERANDA
   ===================================================================== */
function pageHome() {
  const bestSellers = [...PRODUCTS].sort((a, b) => b.sold - a.sold).slice(0, 8);
  const newest = [...PRODUCTS].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const flash = PRODUCTS.filter((p) => p.flashSale);
  const hasHistory = Store.state.viewed.length > 0;
  const forYou = ShopiaAI.recommend(8);

  return `
  <!-- Banner promo -->
  <div class="banner-wrap">
    <div class="banner-track" id="banner-track">
      ${BANNERS.map(
        (b) => `
        <div class="banner" style="background:linear-gradient(135deg,${b.bg[0]},${b.bg[1]})">
          <div>
            <h3>${b.title}</h3>
            <p>${b.subtitle}</p>
            ${b.link === "#ai" ? `<button class="btn" data-open-ai>${b.cta}</button>` : `<a class="btn" href="${b.link}">${b.cta}</a>`}
          </div>
          <div class="banner-emoji">${b.emoji}</div>
        </div>`
      ).join("")}
    </div>
    <div class="banner-dots" id="banner-dots">${BANNERS.map((_, i) => `<button data-slide="${i}" class="${i === 0 ? "active" : ""}" aria-label="Banner ${i + 1}"></button>`).join("")}</div>
  </div>

  <div class="perks">
    <div class="perk"><span>🚚</span>Gratis Ongkir</div>
    <div class="perk"><span>✨</span>Asisten AI</div>
    <div class="perk"><span>🛡️</span>100% Original</div>
    <div class="perk"><span>↩️</span>Retur 7 Hari</div>
  </div>

  <!-- Kategori -->
  <section class="section">
    <div class="section-head"><h2>Kategori</h2><a href="#/katalog">Lihat semua</a></div>
    <div class="cats">
      ${CATEGORIES.map((c) => `<a class="cat" href="#/katalog?cat=${c.id}"><span class="cat-ico">${c.icon}</span>${c.name}</a>`).join("")}
      <a class="cat" href="#/katalog"><span class="cat-ico">🗂️</span>Semua</a>
    </div>
  </section>

  <!-- Flash sale -->
  ${
    flash.length
      ? `<section class="section flash">
    <div class="section-head">
      <h2>⚡ Flash Sale <span class="countdown" data-countdown></span></h2>
      <a href="#/katalog?sort=diskon">Semua</a>
    </div>
    <div class="hscroll">
      ${flash
        .map((p) => {
          // Persentase "terjual" untuk efek urgensi (dihitung dari stok)
          const pct = Math.min(95, Math.round((p.sold / (p.sold + p.stock * 20)) * 100));
          return `<div>${productCard(p, { compact: true })}<div class="stock-bar"><i style="width:${pct}%"></i></div><div class="small muted" style="margin-top:2px">${p.stock < 30 ? "🔥 Segera habis" : `Sisa ${p.stock}`}</div></div>`;
        })
        .join("")}
    </div>
  </section>`
      : ""
  }

  <!-- Voucher -->
  <section class="section">
    <div class="section-head"><h2>🎟️ Voucher untukmu</h2></div>
    <div class="voucher-list">
      ${VOUCHERS.map((v) => `<button class="voucher-card" data-action="copy-voucher" data-code="${v.code}"><b>${v.code}</b>${v.desc}<div style="margin-top:6px;color:var(--primary);font-weight:700">Salin kode</div></button>`).join("")}
    </div>
  </section>

  <!-- Rekomendasi AI -->
  <section class="section">
    <div class="section-head"><h2>✨ ${hasHistory ? "Pilihan AI untukmu" : "Rekomendasi Kirana"}</h2><button class="btn-link" data-open-ai style="color:var(--primary);font-weight:600;font-size:.85rem">Tanya AI</button></div>
    ${hasHistory ? `<p class="small muted" style="margin:-6px 0 10px">Berdasarkan produk yang kamu lihat</p>` : ""}
    ${grid(forYou.slice(0, 4))}
  </section>

  <!-- Terlaris -->
  <section class="section">
    <div class="section-head"><h2>🔥 Produk Terlaris</h2><a href="#/katalog?sort=terlaris">Lihat semua</a></div>
    ${grid(bestSellers)}
  </section>

  <!-- Terbaru -->
  <section class="section">
    <div class="section-head"><h2>🆕 Produk Terbaru</h2><a href="#/katalog?sort=terbaru">Lihat semua</a></div>
    ${grid(newest)}
  </section>`;
}

/* =====================================================================
   HALAMAN: KATALOG
   ===================================================================== */
const SORTS = {
  relevan: "Paling Relevan",
  terlaris: "Terlaris",
  terbaru: "Terbaru",
  termurah: "Harga Terendah",
  termahal: "Harga Tertinggi",
  rating: "Rating Tertinggi",
  diskon: "Diskon Terbesar",
};

let filterOpen = false; // status panel filter di HP

function pageCatalog(params) {
  const q = params.get("q") || "";
  const cat = params.get("cat") || "";
  const min = Number(params.get("min")) || 0;
  const max = Number(params.get("max")) || 0;
  const rating = Number(params.get("rating")) || 0;
  let sort = params.get("sort") || "";

  let list = [...PRODUCTS];
  let aiNote = "";

  // Pencarian AI: pahami kalimat bebas lalu gabungkan dengan filter manual
  if (q) {
    const r = ShopiaAI.search(q);
    list = r.products;
    const f = r.filters;
    const bits = [];
    if (f.keywords.length) bits.push(`kata kunci <b>${esc(f.keywords.join(", "))}</b>`);
    if (f.category) bits.push(`kategori <b>${esc(categoryName(f.category))}</b>`);
    if (f.color) bits.push(`warna <b>${esc(f.color)}</b>`);
    if (f.minPrice) bits.push(`di atas <b>${formatRupiah(f.minPrice)}</b>`);
    if (f.maxPrice) bits.push(`di bawah <b>${formatRupiah(f.maxPrice)}</b>`);
    if (f.minRating) bits.push(`rating ≥ <b>${f.minRating}</b>`);
    if (f.sort && !sort) sort = f.sort;
    if (bits.length) aiNote = `<div class="ai-understood"><span>✨</span><div>Kirana AI memahami pencarianmu: ${bits.join(" · ")}</div></div>`;
  }
  if (cat) list = list.filter((p) => p.category === cat);
  if (min) list = list.filter((p) => p.price >= min);
  if (max) list = list.filter((p) => p.price <= max);
  if (rating) list = list.filter((p) => p.rating >= rating);

  const sorters = {
    terlaris: (a, b) => b.sold - a.sold,
    terbaru: (a, b) => b.createdAt.localeCompare(a.createdAt),
    termurah: (a, b) => a.price - b.price,
    termahal: (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    diskon: (a, b) => discountPct(b) - discountPct(a),
  };
  if (sorters[sort]) list.sort(sorters[sort]);

  const activeCount = [cat, min, max, rating].filter(Boolean).length;
  const title = q ? `Hasil untuk "${esc(q)}"` : cat ? categoryName(cat) : "Semua Produk";

  return `
  <h1 class="page-title">${title}</h1>
  <div class="chips">
    <a class="chip ${!cat ? "active" : ""}" href="#/katalog${buildQS(params, { cat: "" })}">Semua</a>
    ${CATEGORIES.map((c) => `<a class="chip ${cat === c.id ? "active" : ""}" href="#/katalog${buildQS(params, { cat: c.id })}">${c.icon} ${c.name}</a>`).join("")}
  </div>

  <div class="catalog-layout">
    <!-- Panel filter: bottom sheet di HP, sidebar di desktop -->
    <div class="filter-panel desktop ${filterOpen ? "" : "closed"}" id="filter-panel" data-filter-backdrop>
      <div class="filter-sheet">
        <div class="section-head"><h2>Filter</h2><button class="icon-btn close-filter" data-action="close-filter" aria-label="Tutup">✕</button></div>
        <div class="filter-group">
          <h4>Kategori</h4>
          <div class="chips">
            ${CATEGORIES.map((c) => `<button class="chip ${cat === c.id ? "active" : ""}" data-action="set-filter" data-key="cat" data-value="${cat === c.id ? "" : c.id}">${c.name}</button>`).join("")}
          </div>
        </div>
        <div class="filter-group">
          <h4>Rentang Harga</h4>
          <div class="price-inputs">
            <input class="input" type="number" inputmode="numeric" id="f-min" placeholder="Min" value="${min || ""}" />
            <span>–</span>
            <input class="input" type="number" inputmode="numeric" id="f-max" placeholder="Maks" value="${max || ""}" />
          </div>
          <div class="chips" style="margin-top:8px">
            <button class="chip" data-action="price-preset" data-min="0" data-max="100000">&lt; 100rb</button>
            <button class="chip" data-action="price-preset" data-min="100000" data-max="300000">100rb–300rb</button>
            <button class="chip" data-action="price-preset" data-min="300000" data-max="0">&gt; 300rb</button>
          </div>
        </div>
        <div class="filter-group">
          <h4>Rating</h4>
          <div class="chips">
            ${[4.8, 4.5, 4]
              .map((r) => `<button class="chip ${rating === r ? "active" : ""}" data-action="set-filter" data-key="rating" data-value="${rating === r ? "" : r}">★ ${r}+</button>`)
              .join("")}
          </div>
        </div>
        <button class="btn btn-primary btn-block" data-action="apply-price">Terapkan</button>
        <button class="btn btn-block" style="margin-top:6px;color:var(--muted)" data-action="reset-filter">Reset filter</button>
      </div>
    </div>

    <div>
      <div class="catalog-bar">
        <button class="btn btn-ghost open-filter" data-action="open-filter" style="padding:9px 14px">⚙️ Filter${activeCount ? ` (${activeCount})` : ""}</button>
        <select id="sort-select" aria-label="Urutkan">
          ${Object.entries(SORTS)
            .map(([k, v]) => `<option value="${k}" ${sort === k || (!sort && k === "relevan") ? "selected" : ""}>${v}</option>`)
            .join("")}
        </select>
        <span class="small muted" style="margin-left:auto">${list.length} produk</span>
      </div>
      ${aiNote}
      ${
        list.length
          ? grid(list)
          : emptyState("🔎", "Produk tidak ditemukan", "Coba kata kunci lain atau tanya Kirana AI.", "Reset pencarian") +
            `<div style="text-align:center"><button class="btn btn-outline" data-open-ai data-prefill="${esc(q)}">✨ Tanya Kirana AI</button></div>`
      }
    </div>
  </div>`;
}

// Bangun query string baru dari parameter saat ini + perubahan
function buildQS(params, changes) {
  const p = new URLSearchParams(params);
  for (const [k, v] of Object.entries(changes)) {
    if (v === "" || v === null || v === 0 || v === "0") p.delete(k);
    else p.set(k, v);
  }
  const s = p.toString();
  return s ? "?" + s : "";
}

/* =====================================================================
   HALAMAN: DETAIL PRODUK
   ===================================================================== */
let pdState = { id: null, variant: {}, qty: 1, img: 0 };

function pageProduct(id) {
  const p = Store.getProduct(id);
  if (!p) return emptyState("😕", "Produk tidak ditemukan", "Mungkin produk sudah tidak dijual.", "Kembali ke katalog");
  if (pdState.id !== id) {
    pdState = { id, variant: {}, qty: 1, img: 0 };
    Store.trackView(id);
  }
  const d = discountPct(p);
  const reviews = reviewsOf(p);
  const summary = ShopiaAI.summarizeReviews({ ...p, reviews });
  const similar = ShopiaAI.similar(p, 4);
  const wished = Store.inWishlist(p.id);
  const keys = variantKeys(p);
  const labels = { ukuran: "Ukuran", warna: "Warna" };

  return `
  <div class="pd-layout">
    <!-- Galeri foto -->
    <div class="pd-gallery">
      <div class="pd-main">${thumb(p, pdState.img)}</div>
      <div class="pd-thumbs">
        ${Array.from({ length: galleryCount(p) }, (_, i) => `<button class="${i === pdState.img ? "active" : ""}" data-action="pd-img" data-i="${i}" aria-label="Foto ${i + 1}">${thumb(p, i)}</button>`).join("")}
      </div>
    </div>

    <div>
      <div class="pd-box">
        <span class="small" style="color:var(--primary);font-weight:700">${esc(categoryName(p.category))}</span>
        <h1 class="pd-name">${esc(p.name)}</h1>
        <div class="pd-stats">
          <span>${p.rating > 0 ? `<span class="stars">★</span> ${p.rating} (${reviews.length} ulasan)` : "✨ Produk baru"}</span>
          <span>${formatSold(p.sold)} terjual</span>
          <span style="color:${p.stock < 20 ? "var(--danger)" : "inherit"}">Stok: ${p.stock}</span>
        </div>
        <div class="pd-price" style="margin-top:14px">
          <span class="price">${formatRupiah(p.price)}</span>
          ${d ? `<span class="price-old">${formatRupiah(p.originalPrice)}</span><span class="pill pill-lime">-${d}%</span>` : ""}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          ${p.price >= CONFIG.freeShippingMin ? `<span class="pill pill-success">🚚 Gratis Ongkir</span>` : ""}
          ${p.flashSale ? `<span class="pill pill-accent">⚡ Flash Sale</span>` : ""}
        </div>

        ${keys
          .map(
            (k) => `
          <div class="variant-group">
            <h4>${labels[k] || k}: <span class="muted" style="font-weight:400">${esc(pdState.variant[k] || "pilih")}</span></h4>
            <div class="variant-opts${isCompact(p.variants[k]) ? " compact" : ""}">
              ${p.variants[k].map((v) => `<button class="${pdState.variant[k] === v ? "active" : ""}" data-action="pd-variant" data-key="${k}" data-value="${esc(v)}">${esc(v)}</button>`).join("")}
            </div>
          </div>`
          )
          .join("")}

        <div class="variant-group">
          <h4>Jumlah</h4>
          <div class="qty">
            <button data-action="pd-qty" data-delta="-1" ${pdState.qty <= 1 ? "disabled" : ""} aria-label="Kurangi">−</button>
            <input type="number" id="pd-qty" value="${pdState.qty}" min="1" max="${p.stock}" aria-label="Jumlah" />
            <button data-action="pd-qty" data-delta="1" ${pdState.qty >= p.stock ? "disabled" : ""} aria-label="Tambah">+</button>
          </div>
        </div>

        <div class="pd-actions">
          <a class="btn btn-ghost chat-btn" href="#/chat?p=${p.id}" aria-label="Chat penjual" title="Chat penjual">💬</a>
          <button class="btn btn-ghost chat-btn" data-action="wish" data-id="${p.id}" aria-label="Wishlist">${wished ? "💜" : "🤍"}</button>
          <button class="btn btn-primary" data-action="pd-add" ${p.stock <= 0 ? "disabled" : ""}>🛒 Keranjang</button>
          <button class="btn btn-dark" data-action="pd-buy" ${p.stock <= 0 ? "disabled" : ""}>Beli Sekarang</button>
        </div>
      </div>

      <!-- Ringkasan ulasan oleh AI -->
      ${
        summary
          ? `<div class="ai-box">
        <h3>✨ Ringkasan AI dari ${reviews.length} ulasan</h3>
        <p class="small"><b>${summary.verdict}</b> — ${summary.pct}% pembeli memberi bintang 4 atau 5.</p>
        ${summary.pros.length ? `<ul>${summary.pros.map((x) => `<li class="pill pill-success">👍 ${x}</li>`).join("")}</ul>` : ""}
        ${summary.cons.length ? `<ul>${summary.cons.map((x) => `<li class="pill pill-accent">⚠️ Catatan: ${x}</li>`).join("")}</ul>` : ""}
        <button class="btn btn-ghost" style="margin-top:10px;padding:8px 12px;font-size:.82rem" data-open-ai data-prefill="Apakah ${esc(p.name)} cocok untuk saya?">Tanya AI tentang produk ini</button>
      </div>`
          : ""
      }

      <div class="pd-box shop-row">
        <span class="shop-ava">K</span>
        <div style="flex:1;min-width:0"><b>Kirana Official Store</b><div class="small muted">🟢 Online · balas chat ± 1 menit (dibantu AI)</div></div>
        <a class="btn btn-outline" style="padding:8px 14px" href="#/chat?p=${p.id}">💬 Chat</a>
      </div>

      <div class="pd-box">
        <h3 style="font-size:1rem;margin-bottom:8px">Deskripsi Produk</h3>
        <p class="desc">${esc(p.description)}</p>
      </div>

      <div class="pd-box">
        <div class="section-head" style="margin-bottom:4px"><h2 style="font-size:1rem">Ulasan Pembeli</h2>${p.rating > 0 ? `<span class="small"><span class="stars">★</span> ${p.rating}/5</span>` : ""}</div>
        ${
          reviews.length
            ? reviews
                .map(
                  (r) => `
          <div class="review">
            <div class="review-head"><span class="avatar">${esc(r.name[0])}</span><div><b>${esc(r.name)}</b>${r.mine ? ` <span class="pill pill-success" style="font-size:.65rem">Ulasan kamu</span>` : ""}<div class="stars">${stars(r.rating)}</div></div><span class="small muted" style="margin-left:auto">${new Date(r.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span></div>
            <p class="small" style="margin-top:6px">${esc(r.text)}</p>
          </div>`
                )
                .join("")
            : `<p class="small muted">Belum ada ulasan.</p>`
        }
      </div>
    </div>
  </div>

  ${
    similar.length
      ? `<section class="section">
    <div class="section-head"><h2>✨ Produk serupa</h2></div>
    ${grid(similar)}
  </section>`
      : ""
  }`;
}

/* =====================================================================
   HALAMAN: KERANJANG
   ===================================================================== */

// Hitung semua total (dipakai di keranjang & checkout)
function calcTotals(shippingId = null) {
  const sub = Store.subtotal();
  const v = Store.evaluateVoucher(Store.state.voucher, sub);
  // Voucher tidak lagi memenuhi syarat (mis. jumlah dikurangi) -> abaikan
  const discount = v.ok ? v.discount : 0;
  let shipping = 0;
  let shippingNote = "";
  if (shippingId) {
    const s = SHIPPING.find((x) => x.id === shippingId);
    shipping = s ? s.cost : 0;
    if (v.ok && v.freeShipping) {
      shippingNote = "Gratis (voucher)";
      shipping = 0;
    } else if ((shippingId === "reguler" || shippingId === "hemat") && sub - discount >= CONFIG.freeShippingMin) {
      shippingNote = "Gratis ongkir";
      shipping = 0;
    }
  }
  return { sub, discount, shipping, shippingNote, voucher: v, total: Math.max(0, sub - discount + shipping) };
}

function voucherBlock() {
  const t = calcTotals();
  const code = Store.state.voucher;
  if (code && t.voucher.ok)
    return `<div class="voucher-ok"><span>🎟️ <b>${esc(code)}</b> — ${esc(t.voucher.message)}</span><button data-action="remove-voucher" class="remove-btn" aria-label="Hapus voucher">✕</button></div>`;
  return `
    <form class="voucher-form" data-form="voucher">
      <input class="input" name="code" placeholder="Masukkan kode voucher" value="${code ? esc(code) : ""}" aria-label="Kode voucher" />
      <button class="btn btn-ghost" type="submit">Pakai</button>
    </form>
    ${code && !t.voucher.ok ? `<div class="voucher-err">Voucher ${esc(code)}: ${esc(t.voucher.message)}</div>` : ""}
    <div class="voucher-list" style="margin-top:4px">
      ${VOUCHERS.map((v) => `<button class="voucher-card" style="min-width:170px" data-action="use-voucher" data-code="${v.code}"><b>${v.code}</b>${v.desc}</button>`).join("")}
    </div>`;
}

function pageCart() {
  const lines = Store.cartLines();
  if (!lines.length)
    return `<h1 class="page-title">Keranjang</h1>` + emptyState("🛒", "Keranjangmu masih kosong", "Yuk, temukan produk favoritmu!", "Mulai Belanja") + recommendSection("Mungkin kamu suka");

  const t = calcTotals();
  const remaining = CONFIG.freeShippingMin - (t.sub - t.discount);
  const pct = Math.min(100, Math.round(((t.sub - t.discount) / CONFIG.freeShippingMin) * 100));

  return `
  <h1 class="page-title">Keranjang (${Store.cartCount()})</h1>
  <div class="cart-layout">
    <div>
      <div class="free-ship-bar">
        ${remaining > 0 ? `🚚 Belanja <b>${formatRupiah(remaining)}</b> lagi untuk <b>gratis ongkir</b>!` : `🎉 Kamu dapat <b>gratis ongkir</b> Reguler!`}
        <div class="stock-bar"><i style="width:${pct}%"></i></div>
      </div>
      ${lines
        .map((l) => {
          const v = [l.variant.ukuran, l.variant.warna].filter(Boolean).join(", ");
          return `
        <div class="cart-item">
          <a href="#/produk/${l.id}" class="thumb">${thumb(l.product)}</a>
          <div class="body">
            <a href="#/produk/${l.id}" class="name">${esc(l.product.name)}</a>
            ${v ? `<span class="small muted">Varian: ${esc(v)}</span>` : ""}
            <span class="price" style="font-size:.95rem">${formatRupiah(l.product.price)}</span>
            <div class="row">
              <div class="qty">
                <button data-action="cart-qty" data-key="${esc(l.key)}" data-delta="-1" ${l.qty <= 1 ? "disabled" : ""} aria-label="Kurangi">−</button>
                <input type="number" value="${l.qty}" data-action="cart-qty-input" data-key="${esc(l.key)}" aria-label="Jumlah" />
                <button data-action="cart-qty" data-key="${esc(l.key)}" data-delta="1" ${l.qty >= l.product.stock ? "disabled" : ""} aria-label="Tambah">+</button>
              </div>
              <button class="remove-btn" data-action="cart-remove" data-key="${esc(l.key)}">🗑️ Hapus</button>
            </div>
          </div>
        </div>`;
        })
        .join("")}
    </div>

    <div class="card summary">
      <h3 style="margin-bottom:6px">Ringkasan Belanja</h3>
      ${voucherBlock()}
      <div class="summary-row"><span>Subtotal</span><span>${formatRupiah(t.sub)}</span></div>
      ${t.discount ? `<div class="summary-row" style="color:var(--success)"><span>Diskon voucher</span><span>−${formatRupiah(t.discount)}</span></div>` : ""}
      ${t.voucher.ok && t.voucher.freeShipping ? `<div class="summary-row" style="color:var(--success)"><span>Ongkir</span><span>Gratis</span></div>` : ""}
      <div class="summary-row total"><span>Total</span><span>${formatRupiah(t.total)}</span></div>
      <p class="small muted" style="margin:4px 0 12px">Ongkir dihitung saat checkout</p>
      <a href="#/checkout" class="btn btn-primary btn-block">Checkout (${Store.cartCount()})</a>
    </div>
  </div>
  ${recommendSection("✨ Sering dibeli bersama")}`;
}

function recommendSection(title) {
  const inCart = Store.state.cart.map((i) => i.id);
  const rec = ShopiaAI.recommend(8).filter((p) => !inCart.includes(p.id)).slice(0, 4);
  return rec.length ? `<section class="section"><div class="section-head"><h2>${title}</h2></div>${grid(rec)}</section>` : "";
}

/* =====================================================================
   HALAMAN: CHECKOUT
   ===================================================================== */
let checkoutState = { shipping: "reguler", payment: "qris" };

function pageCheckout() {
  const lines = Store.cartLines();
  if (!lines.length) return `<h1 class="page-title">Checkout</h1>` + emptyState("🛒", "Keranjang kosong", "Tambahkan produk dulu sebelum checkout.", "Mulai Belanja");

  const t = calcTotals(checkoutState.shipping);
  const u = Store.user();
  // Isi otomatis alamat dari pesanan terakhir
  const last = Store.myOrders()[0];
  const addr = (last && last.address) || {};

  return `
  <h1 class="page-title">Checkout</h1>
  <form class="checkout-layout" data-form="checkout" novalidate>
    <div>
      <div class="card step">
        <h3><span class="num">1</span> Alamat Pengiriman</h3>
        <div class="form-grid two">
          <label>Nama penerima<input class="input" name="name" required value="${esc(addr.name || (u && u.name) || "")}" /></label>
          <label>No. HP<input class="input" name="phone" type="tel" inputmode="tel" required placeholder="08xxxxxxxxxx" value="${esc(addr.phone || "")}" /></label>
          <label class="full">Alamat lengkap<textarea class="input" name="street" rows="2" required placeholder="Nama jalan, nomor rumah, RT/RW">${esc(addr.street || "")}</textarea></label>
          <label>Kota / Kabupaten<input class="input" name="city" required value="${esc(addr.city || "")}" /></label>
          <label>Kode pos<input class="input" name="zip" inputmode="numeric" required value="${esc(addr.zip || "")}" /></label>
          <label class="full">Catatan untuk penjual (opsional)<input class="input" name="note" placeholder="Contoh: warna cadangan hitam" /></label>
        </div>
      </div>

      <div class="card step">
        <h3><span class="num">2</span> Pilihan Pengiriman</h3>
        ${SHIPPING.map((s) => {
          const free = (s.id === "reguler" || s.id === "hemat") && t.sub - t.discount >= CONFIG.freeShippingMin;
          const vFree = t.voucher.ok && t.voucher.freeShipping;
          return `<label class="option"><input type="radio" name="shipping" value="${s.id}" ${checkoutState.shipping === s.id ? "checked" : ""} />
            <div class="grow"><b>${s.name}</b><div class="small muted">Estimasi ${s.eta}</div></div>
            <b>${free || vFree ? `<span style="color:var(--success)">Gratis</span> <s class="small muted">${formatRupiah(s.cost)}</s>` : formatRupiah(s.cost)}</b></label>`;
        }).join("")}
      </div>

      <div class="card step">
        <h3><span class="num">3</span> Metode Pembayaran</h3>
        ${PAYMENTS.map(
          (p) => `<label class="option"><input type="radio" name="payment" value="${p.id}" ${checkoutState.payment === p.id ? "checked" : ""} />
            <span class="ico">${p.icon}</span><div class="grow"><b>${p.name}</b><div class="small muted">${p.desc}</div></div></label>`
        ).join("")}
      </div>
    </div>

    <div class="sticky">
      <div class="card step">
        <h3><span class="num">4</span> Ringkasan Pesanan</h3>
        ${lines
          .map((l) => {
            const v = [l.variant.ukuran, l.variant.warna].filter(Boolean).join(", ");
            return `<div class="mini-line"><span class="thumb">${thumb(l.product)}</span><div style="flex:1;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(l.product.name)}</div><div class="small muted">${l.qty} × ${formatRupiah(l.product.price)}${v ? " · " + esc(v) : ""}</div></div><b>${formatRupiah(l.qty * l.product.price)}</b></div>`;
          })
          .join("")}
        <div style="margin-top:8px">${voucherBlock()}</div>
        <div class="summary-row"><span>Subtotal</span><span>${formatRupiah(t.sub)}</span></div>
        ${t.discount ? `<div class="summary-row" style="color:var(--success)"><span>Diskon voucher</span><span>−${formatRupiah(t.discount)}</span></div>` : ""}
        <div class="summary-row"><span>Ongkir</span><span>${t.shippingNote ? `<span style="color:var(--success)">${t.shippingNote}</span>` : formatRupiah(t.shipping)}</span></div>
        <div class="summary-row total"><span>Total Bayar</span><span>${formatRupiah(t.total)}</span></div>
        <button class="btn btn-primary btn-block" type="submit" style="margin-top:12px">Buat Pesanan</button>
        <p class="small muted" style="text-align:center;margin-top:8px">🔒 Data kamu aman dan terenkripsi</p>
      </div>
    </div>
  </form>`;
}

/* =====================================================================
   HALAMAN: PESANAN BERHASIL
   ===================================================================== */
function pageSuccess(id) {
  const o = Store.state.orders.find((x) => x.id === id);
  if (!o) return emptyState("🤔", "Pesanan tidak ditemukan", "", "Ke Beranda", "#/");
  const pay = PAYMENTS.find((p) => p.id === o.payment) || {};
  const instructions = {
    qris: "Scan kode QRIS yang dikirim ke WhatsApp kamu dalam 1×24 jam.",
    ewallet: "Notifikasi pembayaran akan muncul di aplikasi e-wallet kamu.",
    va: `Transfer ke Virtual Account: <b>8808 ${o.id.slice(-8)}</b> dalam 1×24 jam.`,
    cod: "Siapkan uang tunai saat kurir tiba. Tidak perlu bayar sekarang.",
  };
  const msg = `Halo Kirana, saya ingin konfirmasi pesanan ${o.id} sebesar ${formatRupiah(o.total)}.`;
  return `
  <div class="empty" style="padding-bottom:10px">
    <div class="big">🎉</div>
    <h3>Pesanan berhasil dibuat!</h3>
    <p class="muted">Terima kasih, ${esc(o.address.name)}. Nomor pesanan: <b>${o.id}</b></p>
  </div>
  <div class="card summary" style="max-width:520px;margin:0 auto">
    <div class="summary-row"><span>Metode bayar</span><b>${pay.icon || ""} ${pay.name || ""}</b></div>
    <div class="summary-row"><span>Pengiriman</span><b>${esc((SHIPPING.find((s) => s.id === o.shipping) || {}).name || "")}</b></div>
    <div class="summary-row total"><span>Total</span><span>${formatRupiah(o.total)}</span></div>
    <p class="small" style="background:var(--primary-soft);padding:10px;border-radius:10px;margin-top:10px">💡 ${instructions[o.payment] || ""}</p>
    <a class="btn btn-primary btn-block" style="margin-top:12px;background:#25d366" target="_blank" rel="noopener" href="${waLink(msg)}">Konfirmasi via WhatsApp</a>
    <a class="btn btn-outline btn-block" style="margin-top:8px" href="#/pesanan">Lihat Riwayat Pesanan</a>
    <a class="btn btn-block" style="margin-top:4px;color:var(--muted)" href="#/">Lanjut Belanja</a>
  </div>`;
}

/* =====================================================================
   HALAMAN: AKUN, PESANAN, WISHLIST
   ===================================================================== */
let authTab = "masuk";

function pageAccount() {
  const u = Store.user();
  if (!u) {
    return `
    <div style="max-width:420px;margin:0 auto">
      <div class="hero-info" style="text-align:center"><h1>Selamat datang di Kirana 💜</h1><p>Masuk untuk menyimpan pesanan, wishlist, dan dapat rekomendasi AI yang lebih personal.</p></div>
      <div class="card" style="padding:16px;margin-top:14px">
        <div class="auth-tabs">
          <button class="${authTab === "masuk" ? "active" : ""}" data-action="auth-tab" data-tab="masuk">Masuk</button>
          <button class="${authTab === "daftar" ? "active" : ""}" data-action="auth-tab" data-tab="daftar">Daftar</button>
        </div>
        <form class="form-grid" data-form="${authTab}">
          ${authTab === "daftar" ? `<label>Nama lengkap<input class="input" name="name" required autocomplete="name" /></label>` : ""}
          <label>Email<input class="input" name="email" type="email" required autocomplete="email" /></label>
          <label>Kata sandi<input class="input" name="password" type="password" required minlength="6" autocomplete="${authTab === "daftar" ? "new-password" : "current-password"}" /></label>
          <p class="voucher-err hidden" id="auth-err"></p>
          <button class="btn btn-primary btn-block" type="submit">${authTab === "daftar" ? "Daftar Sekarang" : "Masuk"}</button>
          ${authTab === "daftar" ? `<p class="small muted" style="text-align:center">🎁 Pengguna baru dapat voucher <b>KIRANABARU</b> diskon 15%</p>` : ""}
        </form>
      </div>
      ${isStandalone() ? "" : `<button class="btn btn-outline btn-block" style="margin-top:12px" data-action="install-app">📲 Install Aplikasi Kirana</button>`}
      <p class="small muted" style="text-align:center;margin-top:12px">Penjual? <a href="#/admin" style="color:var(--primary);font-weight:700">🏪 Masuk Dasbor Penjual</a></p>
      ${Store.myOrders().length ? `<p class="small muted" style="text-align:center;margin-top:12px">Belanja sebagai tamu? <a href="#/pesanan" style="color:var(--primary);font-weight:700">Lihat pesanan tamu</a></p>` : ""}
    </div>`;
  }
  const orders = Store.myOrders();
  return `
  <div class="profile-head">
    <span class="avatar">${esc(u.name[0].toUpperCase())}</span>
    <div><b style="font-size:1.1rem">${esc(u.name)}</b><div class="small" style="opacity:.85">${esc(u.email)}</div></div>
  </div>
  <div class="perks" style="grid-template-columns:repeat(3,1fr)">
    <a class="perk" href="#/pesanan"><span>📦</span>${orders.length} Pesanan</a>
    <a class="perk" href="#/wishlist"><span>💜</span>${Store.state.wishlist.length} Wishlist</a>
    <a class="perk" href="#/keranjang"><span>🛒</span>${Store.cartCount()} Keranjang</a>
  </div>
  <div class="card menu-list" style="margin-top:14px">
    <a href="#/pesanan">📦 Riwayat Pesanan <span class="arrow">›</span></a>
    <a href="#/wishlist">💜 Wishlist <span class="arrow">›</span></a>
    <a href="#/chat">💬 Chat Penjual <span class="arrow">›</span></a>
    <button data-open-ai>✨ Tanya Kirana AI <span class="arrow">›</span></button>
    ${isStandalone() ? "" : `<button data-action="install-app">📲 Install Aplikasi Kirana <span class="arrow">›</span></button>`}
    <a href="#/faq">❓ Pusat Bantuan <span class="arrow">›</span></a>
    <a href="#/kontak">💬 Hubungi Kami <span class="arrow">›</span></a>
    <a href="#/admin">🏪 Dasbor Penjual <span class="arrow">›</span></a>
    <button data-action="logout" style="color:var(--danger)">🚪 Keluar</button>
  </div>
  ${recommendSection("✨ Rekomendasi untukmu")}`;
}

// Status pesanan demo: berubah otomatis sesuai umur pesanan
const ORDER_STEPS = ["Diproses", "Dikemas", "Dikirim", "Selesai"];
function orderStatus(o) {
  if (o.receivedAt) return 3;
  const mins = (Date.now() - new Date(o.date).getTime()) / 60000;
  if (mins < 2) return 0;
  if (mins < 10) return 1;
  if (mins < 60) return 2;
  return 3;
}

function pageOrders() {
  const orders = Store.myOrders();
  return `
  <h1 class="page-title">Riwayat Pesanan</h1>
  ${
    !orders.length
      ? emptyState("📦", "Belum ada pesanan", "Pesanan yang kamu buat akan muncul di sini.", "Mulai Belanja")
      : orders
          .map((o) => {
            const step = orderStatus(o);
            return `
      <div class="card order-card">
        <div class="head"><b>${o.id}</b><span class="muted">${new Date(o.date).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span></div>
        ${o.items
          .map(
            (i) => `<div class="mini-line"><span class="thumb">${Store.getProduct(i.id) ? thumb(Store.getProduct(i.id)) : "📦"}</span><div style="flex:1;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(i.name)}</div><div class="small muted">${i.qty} × ${formatRupiah(i.price)}${i.variant ? " · " + esc(i.variant) : ""}</div></div></div>`
          )
          .join("")}
        <div class="order-track">
          ${ORDER_STEPS.map((s, i) => `<div class="${i <= step ? "done" : ""}"><i>${i <= step ? "✓" : ""}</i>${s}</div>`).join("")}
        </div>
        <div class="summary-row total"><span>Total</span><span>${formatRupiah(o.total)}</span></div>
        <div class="order-btns">
          <a class="btn btn-ghost" href="#/lacak/${o.id}">🚚 Lacak</a>
          <a class="btn btn-ghost" href="#/chat?o=${o.id}">💬 Chat Penjual</a>
          ${
            step === 2
              ? `<button class="btn btn-primary" data-action="order-received" data-id="${o.id}">✅ Pesanan Diterima</button>`
              : step === 3
              ? o.items.every((i) => Store.reviewFor(i.id, o.id))
                ? `<button class="btn btn-outline" data-action="open-review" data-id="${o.id}">⭐ Ubah Ulasan</button>`
                : `<button class="btn btn-primary" data-action="open-review" data-id="${o.id}">⭐ Beri Ulasan</button>`
              : ""
          }
          <button class="btn btn-ghost" data-action="reorder" data-id="${o.id}">🔁 Beli Lagi</button>
        </div>
      </div>`;
          })
          .join("")
  }`;
}

/* =====================================================================
   HALAMAN: LACAK PESANAN (riwayat perjalanan paket + nomor resi)
   ===================================================================== */
// Riwayat perjalanan demo. "min" = menit setelah pesanan dibuat.
function trackingEvents(o) {
  const city = (o.address && o.address.city) || "kota tujuan";
  const who = (o.address && o.address.name) || "penerima";
  const ev = [
    { min: 0, step: 0, text: "Pesanan dibuat. Menunggu konfirmasi penjual." },
    { min: 1, step: 0, text: "Pesanan dikonfirmasi oleh Kirana Official Store." },
    { min: 2, step: 1, text: "Penjual sedang mengemas pesanan." },
    { min: 10, step: 2, text: "Paket diserahkan ke kurir Kirana Express di Gudang Jakarta Selatan." },
    { min: 20, step: 2, text: "Paket tiba di pusat sortir Jakarta Timur." },
    { min: 30, step: 2, text: `Paket dalam perjalanan menuju ${city}.` },
    { min: 45, step: 2, text: `Paket tiba di hub ${city}.` },
    { min: 52, step: 2, text: "Paket dibawa kurir menuju alamatmu. 🛵" },
    { min: 60, step: 3, text: `Paket diterima oleh ${who}. 🎉` },
  ];
  const age = (Date.now() - new Date(o.date).getTime()) / 60000;
  const start = new Date(o.date).getTime();
  return ev
    .filter((e) => e.min <= age || (o.receivedAt && e.min <= 60))
    .map((e) => ({ ...e, time: e.min === 60 && o.receivedAt && age < 60 ? new Date(o.receivedAt) : new Date(start + e.min * 60000) }))
    .reverse();
}

function pageTracking(id) {
  const o = Store.state.orders.find((x) => x.id === id);
  if (!o) return emptyState("📦", "Pesanan tidak ditemukan", "Coba buka dari menu Riwayat Pesanan.", "Lihat Pesanan", "#/pesanan");
  const step = orderStatus(o);
  const ship = SHIPPING.find((s) => s.id === o.shipping) || SHIPPING[1];
  const resi = "KRX" + o.id.replace(/\D/g, "").padStart(8, "0") + "ID";
  const events = trackingEvents(o);
  const pct = [8, 35, 68, 100][step];
  return `
  <h1 class="page-title"><a href="#/pesanan" aria-label="Kembali" style="margin-right:6px">‹</a>Lacak Pesanan</h1>
  <div class="track-hero">
    <div class="small" style="opacity:.85">Status</div>
    <b style="font-size:1.25rem">${["Sedang diproses", "Sedang dikemas", "Dalam pengiriman", "Pesanan selesai"][step]}</b>
    <div class="track-road"><i style="width:${pct}%"></i><span style="left:${pct}%">${step === 3 ? "🏠" : "🚚"}</span></div>
    <div class="track-meta">
      <div><span>Kurir</span><b>Kirana Express · ${esc(ship.name)}</b></div>
      <div><span>No. Resi</span><b>${resi}</b> <button class="btn-link" data-action="copy-text" data-text="${resi}" style="color:#fff;text-decoration:underline">Salin</button></div>
    </div>
  </div>

  <div class="card" style="padding:16px;margin-top:14px">
    <h3 style="font-size:1rem;margin-bottom:10px">Riwayat Perjalanan</h3>
    <ol class="timeline">
      ${events
        .map(
          (e, i) => `<li class="${i === 0 ? "now" : ""}"><i></i><div><div>${esc(e.text)}</div><div class="small muted">${e.time.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div></div></li>`
        )
        .join("")}
    </ol>
  </div>

  <div class="card" style="padding:16px;margin-top:14px">
    <h3 style="font-size:1rem;margin-bottom:6px">Alamat Pengiriman</h3>
    <p class="small"><b>${esc(o.address?.name || "-")}</b> · ${esc(o.address?.phone || "")}<br />${esc(o.address?.street || "")}, ${esc(o.address?.city || "")} ${esc(o.address?.zip || "")}</p>
  </div>

  <div class="order-btns" style="margin-top:14px">
    <a class="btn btn-ghost" href="#/chat?o=${o.id}">💬 Chat Penjual</a>
    ${step === 2 ? `<button class="btn btn-primary" data-action="order-received" data-id="${o.id}">✅ Pesanan Diterima</button>` : ""}
    ${step === 3 ? `<button class="btn btn-primary" data-action="open-review" data-id="${o.id}">⭐ Beri Ulasan</button>` : ""}
  </div>`;
}

/* =====================================================================
   HALAMAN: CHAT PENJUAL (dibalas otomatis oleh Kirana AI)
   ===================================================================== */
let sellerBusy = false;
const SELLER_QUICK = {
  product: ["Masih ready, kak?", "Ukuran yang pas?", "Ada warna apa saja?", "Original?", "Bisa dikirim hari ini?"],
  order: ["Pesanan saya sampai kapan?", "Bisa dikirim hari ini?", "Mau tukar ukuran"],
  general: ["Bisa dikirim hari ini?", "Ada voucher?", "Rekomendasi buat aku", "Metode pembayaran?"],
};

function sellerContext() {
  const { params } = parseHash();
  const product = params.get("p") ? Store.getProduct(params.get("p")) : null;
  const order = params.get("o") ? Store.state.orders.find((x) => x.id === params.get("o")) : null;
  return { product, order };
}

function sellerMsgHTML(m) {
  if (m.role === "context") {
    const p = m.productId && Store.getProduct(m.productId);
    if (p) return `<a class="chat-ctx" href="#/produk/${p.id}"><span class="thumb">${thumb(p)}</span><div><div class="small muted">Kamu bertanya tentang</div><b>${esc(p.name)}</b><div style="color:var(--primary);font-weight:700">${formatRupiah(p.price)}</div></div></a>`;
    if (m.orderId) return `<a class="chat-ctx" href="#/lacak/${m.orderId}"><span class="thumb" style="display:grid;place-items:center;font-size:1.6rem">📦</span><div><div class="small muted">Kamu bertanya tentang pesanan</div><b>${esc(m.orderId)}</b></div></a>`;
    return "";
  }
  const time = m.time ? new Date(m.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";
  return `<div class="msg ${m.role === "user" ? "user" : "bot"}">${esc(m.text)}${
    m.products && m.products.length
      ? `<div class="msg-products">${m.products.map((id) => Store.getProduct(id)).filter(Boolean).map((p) => productCard(p, { compact: true })).join("")}</div>`
      : ""
  }<span class="msg-time">${time}${m.role === "user" ? " ✓✓" : ""}</span></div>`;
}

function pageSellerChat() {
  const { product, order } = sellerContext();
  const quick = product ? SELLER_QUICK.product : order ? SELLER_QUICK.order : SELLER_QUICK.general;
  const msgs = Store.state.sellerChat.length
    ? Store.state.sellerChat
    : [{ role: "seller", text: "Halo kak, selamat datang di Kirana Official Store 😊\nChat ini dibalas otomatis oleh Kirana AI 24 jam. Silakan tanya stok, ukuran, pengiriman, atau pesananmu.", time: new Date().toISOString() }];
  const ctx = product ? { role: "context", productId: product.id } : order ? { role: "context", orderId: order.id } : null;
  return `
  <div class="seller-chat">
    <div class="seller-head">
      <a href="javascript:history.back()" aria-label="Kembali" class="back">‹</a>
      <span class="shop-ava">K</span>
      <div style="flex:1;min-width:0"><b>Kirana Official Store</b><small>🟢 Online · dibalas oleh Kirana AI ✨</small></div>
      <button class="icon-btn" data-action="seller-clear" title="Hapus chat" aria-label="Hapus chat">🗑️</button>
    </div>
    <div class="seller-msgs" id="seller-msgs">${msgs.map(sellerMsgHTML).join("")}${ctx ? sellerMsgHTML(ctx) : ""}</div>
    <div class="ai-suggest">${quick.map((q) => `<button data-action="seller-quick" data-text="${esc(q)}">${esc(q)}</button>`).join("")}</div>
    <form class="ai-input" data-form="seller-chat">
      <input class="input" name="text" id="seller-text" placeholder="Tulis pesan ke penjual..." autocomplete="off" aria-label="Pesan" />
      <button class="btn btn-primary" type="submit" aria-label="Kirim">➤</button>
    </form>
  </div>`;
}

async function sendSellerChat(text) {
  text = (text || "").trim();
  if (!text || sellerBusy) return;
  sellerBusy = true;
  const { product, order } = sellerContext();
  let history = [...Store.state.sellerChat];
  // Simpan kartu produk/pesanan sekali sebelum pertanyaan pertama tentangnya
  const last = [...history].reverse().find((m) => m.role === "context");
  if (product && !(last && last.productId === product.id)) history.push({ role: "context", productId: product.id });
  if (order && !(last && last.orderId === order.id)) history.push({ role: "context", orderId: order.id });
  history.push({ role: "user", text, time: new Date().toISOString() });
  Store.saveSellerChat(history);
  const box = document.getElementById("seller-msgs");
  const draw = () => {
    if (!box || !document.body.contains(box)) return;
    box.innerHTML = history.map(sellerMsgHTML).join("");
    box.scrollTop = box.scrollHeight;
  };
  draw();
  if (box) {
    box.insertAdjacentHTML("beforeend", `<div class="msg bot typing"><span></span><span></span><span></span></div>`);
    box.scrollTop = box.scrollHeight;
  }
  try {
    const chatHistory = history.filter((m) => m.role !== "context").slice(0, -1).map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.text }));
    const r = await ShopiaAI.sellerChat(text, { product, order, history: chatHistory });
    history.push({ role: "seller", text: r.text, products: (r.products || []).map((p) => p.id), time: new Date().toISOString() });
  } catch (err) {
    history.push({ role: "seller", text: "Maaf kak, ada gangguan. Coba kirim ulang ya 🙏", time: new Date().toISOString() });
  }
  sellerBusy = false;
  Store.saveSellerChat(history);
  draw();
}

/* =====================================================================
   MODAL TULIS ULASAN (setelah pesanan selesai)
   ===================================================================== */
function openReviewModal(orderId) {
  const o = Store.state.orders.find((x) => x.id === orderId);
  if (!o) return;
  const u = Store.user();
  const items = o.items.filter((i, idx, arr) => arr.findIndex((x) => x.id === i.id) === idx);
  const ratings = {};
  items.forEach((i) => (ratings[i.id] = (Store.reviewFor(i.id, o.id) || {}).rating || 5));
  const LABEL = ["", "Sangat buruk", "Buruk", "Cukup", "Bagus", "Sangat bagus"];

  modalRoot.innerHTML = `
  <div class="filter-panel" data-close-modal>
    <div class="modal-sheet" role="dialog" aria-label="Beri ulasan">
      <div class="modal-head" style="align-items:center">
        <div style="flex:1"><b style="font-size:1.1rem">⭐ Beri Ulasan</b><div class="small muted">Ceritakan pengalamanmu untuk membantu pembeli lain</div></div>
        <button class="icon-btn" data-close-modal aria-label="Tutup">✕</button>
      </div>
      <form data-form="review" data-order="${o.id}">
        ${items
          .map((i) => {
            const p = Store.getProduct(i.id);
            const old = Store.reviewFor(i.id, o.id);
            return `
          <div class="review-item">
            <div class="mini-line"><span class="thumb">${p ? thumb(p) : "📦"}</span><div style="flex:1;min-width:0"><b class="small">${esc(i.name)}</b>${i.variant ? `<div class="small muted">${esc(i.variant)}</div>` : ""}</div></div>
            <div class="star-pick" data-pid="${i.id}">
              ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" class="${n <= ratings[i.id] ? "on" : ""}" aria-label="${n} bintang">★</button>`).join("")}
              <span class="small muted" data-star-label>${LABEL[ratings[i.id]]}</span>
            </div>
            <div class="review-tags">${["Kualitas bagus", "Sesuai foto", "Pengiriman cepat", "Kemasan rapi", "Harga worth it"].map((tg) => `<button type="button" data-tag="${tg}">${tg}</button>`).join("")}</div>
            <textarea class="input" name="text-${i.id}" rows="3" placeholder="Bagaimana kualitas produknya? (opsional)">${old ? esc(old.text) : ""}</textarea>
          </div>`;
          })
          .join("")}
        <label class="option" style="margin:10px 0"><input type="checkbox" name="anon" /> Sembunyikan nama saya</label>
        <button class="btn btn-primary btn-block" type="submit">Kirim Ulasan</button>
      </form>
    </div>
  </div>`;

  modalRoot.onclick = (e) => {
    const star = e.target.closest("[data-star]");
    if (star) {
      const wrap = star.closest(".star-pick");
      const n = Number(star.dataset.star);
      ratings[wrap.dataset.pid] = n;
      wrap.querySelectorAll("[data-star]").forEach((b) => b.classList.toggle("on", Number(b.dataset.star) <= n));
      wrap.querySelector("[data-star-label]").textContent = LABEL[n];
      return;
    }
    const tag = e.target.closest("[data-tag]");
    if (tag) {
      const ta = tag.closest(".review-item").querySelector("textarea");
      if (!ta.value.includes(tag.dataset.tag)) ta.value = (ta.value ? ta.value.trim() + ". " : "") + tag.dataset.tag;
      tag.classList.add("on");
      return;
    }
    if (e.target.matches("[data-close-modal]") || e.target.closest("button[data-close-modal]")) closeModal();
  };

  modalRoot.querySelector('[data-form="review"]').onsubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const data = Object.fromEntries(new FormData(e.target));
    const rawName = (u && u.name) || (o.address && o.address.name) || "Pembeli Kirana";
    const name = data.anon ? rawName[0] + "***" + rawName.slice(-1) : rawName;
    items.forEach((i) => {
      const r = ratings[i.id];
      const text = (data["text-" + i.id] || "").trim() || ["", "Kurang puas.", "Kurang sesuai harapan.", "Lumayan.", "Bagus, sesuai deskripsi.", "Mantap, sangat puas!"][r];
      Store.addReview({ productId: i.id, orderId: o.id, name, rating: r, text });
    });
    closeModal();
    toast("Terima kasih! Ulasanmu sudah tampil di halaman produk", { icon: "⭐", link: "#/produk/" + items[0].id });
    render(false);
  };
}

function pageWishlist() {
  const list = Store.state.wishlist.map((id) => Store.getProduct(id)).filter(Boolean);
  return `
  <h1 class="page-title">Wishlist (${list.length})</h1>
  ${list.length ? grid(list) : emptyState("💜", "Wishlist masih kosong", "Tekan ikon hati pada produk untuk menyimpannya di sini.", "Jelajahi Produk")}`;
}

/* =====================================================================
   HALAMAN: TENTANG, KONTAK, FAQ
   ===================================================================== */
function pageAbout() {
  return `
  <div class="hero-info">
    <h1>Belanja lebih pintar, bukan lebih ribet.</h1>
    <p>Kirana lahir dari keresahan anak muda yang capek scroll ribuan produk. Kami mengkurasi produk terbaik dan menghadirkan asisten AI yang paham bahasa sehari-hari, jadi kamu bisa menemukan barang yang pas dalam hitungan detik.</p>
    <div class="stats-row"><div><b>50rb+</b>Pembeli</div><div><b>4,8★</b>Rating</div><div><b>120+</b>UMKM Mitra</div></div>
  </div>
  <div class="info-grid">
    <div class="card info-card"><div class="ico">✨</div><h3>Dibantu AI</h3><p>Cari produk cukup dengan ngobrol, dapat rekomendasi personal, dan ringkasan ulasan otomatis.</p></div>
    <div class="card info-card"><div class="ico">🛡️</div><h3>Produk Terkurasi</h3><p>Setiap produk dicek kualitasnya. Tidak sesuai? Uang kembali.</p></div>
    <div class="card info-card"><div class="ico">🧺</div><h3>Dukung UMKM</h3><p>Kami bermitra dengan UMKM lokal agar produk Indonesia makin dikenal.</p></div>
    <div class="card info-card"><div class="ico">💸</div><h3>Harga Jujur</h3><p>Tanpa harga coret palsu. Diskon yang kamu lihat adalah diskon sungguhan.</p></div>
    <div class="card info-card"><div class="ico">🚚</div><h3>Kirim Cepat</h3><p>Pilihan kurir lengkap, dari hemat hingga instan 3 jam.</p></div>
    <div class="card info-card"><div class="ico">💬</div><h3>CS Ramah</h3><p>Admin siap membantu via WhatsApp setiap hari 08.00–22.00 WIB.</p></div>
  </div>`;
}

function pageContact() {
  return `
  <h1 class="page-title">Hubungi Kami</h1>
  <div class="info-grid" style="margin-top:0">
    <a class="card info-card" target="_blank" rel="noopener" href="${waLink("Halo Kirana, saya butuh bantuan.")}"><div class="ico">💬</div><h3>WhatsApp</h3><p>+${CONFIG.whatsapp} (08.00–22.00 WIB)</p></a>
    <a class="card info-card" href="mailto:${CONFIG.email}"><div class="ico">✉️</div><h3>Email</h3><p>${CONFIG.email}</p></a>
    <div class="card info-card"><div class="ico">📍</div><h3>Alamat</h3><p>${CONFIG.address}</p></div>
  </div>
  <div class="card step" style="margin-top:14px">
    <h3>Kirim Pesan</h3>
    <form class="form-grid two" data-form="contact">
      <label>Nama<input class="input" name="name" required /></label>
      <label>Email / No. HP<input class="input" name="contact" required /></label>
      <label class="full">Pesan<textarea class="input" name="message" rows="4" required placeholder="Tulis pertanyaanmu..."></textarea></label>
      <button class="btn btn-primary full" type="submit">Kirim via WhatsApp</button>
    </form>
  </div>`;
}

function pageFaq() {
  return `
  <h1 class="page-title">FAQ - Pertanyaan Umum</h1>
  <div class="card">
    ${FAQS.map((f, i) => `<details class="faq-item" ${i === 0 ? "open" : ""}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
  </div>
  <div class="ai-box" style="text-align:center;margin-top:14px">
    <h3 style="justify-content:center">Tidak menemukan jawaban?</h3>
    <p class="small muted">Tanya Kirana AI atau chat admin kami.</p>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap">
      <button class="btn btn-primary" data-open-ai>✨ Tanya AI</button>
      <a class="btn btn-outline" target="_blank" rel="noopener" href="${waLink("Halo Kirana, saya punya pertanyaan.")}">💬 WhatsApp</a>
    </div>
  </div>`;
}

/* =====================================================================
   ROUTER: tampilkan halaman sesuai hash
   ===================================================================== */
function render(scrollTop = true) {
  const { path, params } = parseHash();
  const parts = path.split("/").filter(Boolean); // contoh: ["produk","p01"]
  let html;
  let title = "Kirana - Belanja Pintar, Dibantu AI";
  document.body.classList.remove("has-pd-actions", "chat-page");

  switch (parts[0]) {
    case undefined:
      html = pageHome();
      break;
    case "katalog":
      html = pageCatalog(params);
      title = "Katalog - Kirana";
      break;
    case "produk": {
      html = pageProduct(parts[1]);
      const p = Store.getProduct(parts[1]);
      if (p) title = `${p.name} - Kirana`;
      document.body.classList.add("has-pd-actions");
      break;
    }
    case "keranjang":
      html = pageCart();
      title = "Keranjang - Kirana";
      break;
    case "checkout":
      html = pageCheckout();
      title = "Checkout - Kirana";
      break;
    case "sukses":
      html = pageSuccess(parts[1]);
      break;
    case "akun":
      html = pageAccount();
      title = "Akun - Kirana";
      break;
    case "pesanan":
      html = pageOrders();
      title = "Pesanan Saya - Kirana";
      break;
    case "lacak":
      html = pageTracking(parts[1]);
      title = "Lacak Pesanan - Kirana";
      break;
    case "chat":
      html = pageSellerChat();
      title = "Chat Penjual - Kirana";
      document.body.classList.add("chat-page");
      break;
    case "wishlist":
      html = pageWishlist();
      title = "Wishlist - Kirana";
      break;
    case "tentang":
      html = pageAbout();
      title = "Tentang Kami - Kirana";
      break;
    case "kontak":
      html = pageContact();
      title = "Kontak - Kirana";
      break;
    case "faq":
      html = pageFaq();
      title = "FAQ - Kirana";
      break;
    case "admin":
      html = Admin.page();
      title = "Dasbor Penjual - Kirana";
      break;
    default:
      html = emptyState("🧭", "Halaman tidak ditemukan", "Link yang kamu buka mungkin salah.", "Ke Beranda", "#/");
  }

  app.innerHTML = html;
  document.title = title;
  if (scrollTop) window.scrollTo(0, 0);

  // Tandai menu aktif di navigasi bawah
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const nav = a.dataset.nav;
    a.classList.toggle("active", nav === "/" ? !parts[0] : "/" + parts[0] === nav);
  });

  // Tombol WhatsApp: sertakan nama produk jika sedang di halaman produk
  const p = parts[0] === "produk" ? Store.getProduct(parts[1]) : null;
  document.getElementById("wa-float").href = waLink(p ? `Halo Kirana, saya mau tanya produk "${p.name}".` : "Halo Kirana, saya mau tanya-tanya.");

  // Isi kotak pencarian sesuai query
  const si = document.getElementById("search-input");
  if (document.activeElement !== si) si.value = parts[0] === "katalog" ? params.get("q") || "" : "";

  tickCountdown();

  if (parts[0] === "chat") {
    const box = document.getElementById("seller-msgs");
    if (box) box.scrollTop = box.scrollHeight;
  }
}

/* =====================================================================
   INTERAKSI (event delegation: satu listener untuk semua tombol)
   ===================================================================== */
document.addEventListener("click", (e) => {
  // Buka Kirana AI dari tombol mana pun yang punya data-open-ai
  const aiBtn = e.target.closest("[data-open-ai]");
  if (aiBtn) {
    e.preventDefault();
    openAI(aiBtn.dataset.prefill || "");
    return;
  }

  // Klik area gelap di luar panel filter (HP) -> tutup
  if (e.target.matches("[data-filter-backdrop]")) {
    filterOpen = false;
    e.target.classList.add("closed");
    return;
  }

  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action;
  const { params } = parseHash();

  switch (a) {
    /* --- Wishlist & keranjang --- */
    case "wish": {
      e.preventDefault();
      const added = Store.toggleWishlist(el.dataset.id);
      toast(added ? "Disimpan ke wishlist" : "Dihapus dari wishlist", { icon: added ? "💜" : "🤍", link: added ? "#/wishlist" : null });
      el.textContent = added ? "💜" : "🤍";
      if (parseHash().path === "/wishlist") render(false);
      break;
    }
    case "quick-add": {
      e.preventDefault();
      const p = Store.getProduct(el.dataset.id);
      if (variantKeys(p).length) openVariantModal(p);
      else addToCart(p.id);
      break;
    }
    case "copy-voucher": {
      const code = el.dataset.code;
      navigator.clipboard?.writeText(code).catch(() => {});
      Store.setVoucher(code); // otomatis terpasang di keranjang (syarat dicek saat checkout)
      toast(`Kode <b>${code}</b> disalin & dipasang di keranjang`, { icon: "🎟️", link: "#/keranjang" });
      break;
    }

    /* --- Katalog --- */
    case "open-filter":
      filterOpen = true;
      document.getElementById("filter-panel").classList.remove("closed");
      break;
    case "close-filter":
      filterOpen = false;
      document.getElementById("filter-panel").classList.add("closed");
      break;
    case "set-filter":
      go("/katalog" + buildQS(params, { [el.dataset.key]: el.dataset.value }), true);
      break;
    case "price-preset":
      go("/katalog" + buildQS(params, { min: el.dataset.min, max: el.dataset.max }), true);
      break;
    case "apply-price": {
      filterOpen = false;
      const min = document.getElementById("f-min").value;
      const max = document.getElementById("f-max").value;
      go("/katalog" + buildQS(params, { min, max }), true);
      break;
    }
    case "reset-filter":
      go("/katalog" + buildQS(params, { cat: "", min: "", max: "", rating: "" }), true);
      break;

    /* --- Detail produk --- */
    case "pd-img":
      pdState.img = Number(el.dataset.i);
      render(false);
      break;
    case "pd-variant":
      pdState.variant[el.dataset.key] = el.dataset.value;
      render(false);
      break;
    case "pd-qty": {
      const p = Store.getProduct(pdState.id);
      pdState.qty = Math.max(1, Math.min(p.stock, pdState.qty + Number(el.dataset.delta)));
      render(false);
      break;
    }
    case "pd-add":
    case "pd-buy": {
      const p = Store.getProduct(pdState.id);
      const missing = variantKeys(p).find((k) => !pdState.variant[k]);
      if (missing) {
        toast(`Pilih ${missing} terlebih dahulu`, { icon: "👆" });
        return;
      }
      addToCart(p.id, { ...pdState.variant }, pdState.qty);
      if (a === "pd-buy") go("/checkout");
      break;
    }

    /* --- Keranjang --- */
    case "cart-qty": {
      const item = Store.state.cart.find((i) => i.key === el.dataset.key);
      if (item) Store.updateQty(item.key, item.qty + Number(el.dataset.delta));
      render(false);
      break;
    }
    case "cart-remove": {
      Store.removeFromCart(el.dataset.key);
      toast("Produk dihapus dari keranjang", { icon: "🗑️" });
      render(false);
      break;
    }
    case "use-voucher": {
      const r = Store.applyVoucher(el.dataset.code);
      toast(r.ok ? `Voucher ${el.dataset.code} dipakai!` : r.message, { icon: r.ok ? "🎉" : "⚠️" });
      render(false);
      break;
    }
    case "remove-voucher":
      Store.removeVoucher();
      render(false);
      break;

    /* --- Akun --- */
    case "auth-tab":
      authTab = el.dataset.tab;
      render(false);
      break;
    case "logout":
      Store.logout();
      toast("Kamu sudah keluar", { icon: "👋" });
      render();
      break;
    case "order-received":
      Store.markReceived(el.dataset.id);
      toast("Pesanan selesai. Yuk beri ulasan!", { icon: "🎉" });
      render(false);
      openReviewModal(el.dataset.id);
      break;
    case "open-review":
      openReviewModal(el.dataset.id);
      break;
    case "copy-text":
      navigator.clipboard?.writeText(el.dataset.text).catch(() => {});
      toast("Disalin", { icon: "📋" });
      break;
    case "seller-quick":
      sendSellerChat(el.dataset.text);
      break;
    case "seller-clear":
      Store.saveSellerChat([]);
      render(false);
      break;
    case "reorder": {
      const o = Store.state.orders.find((x) => x.id === el.dataset.id);
      o.items.forEach((i) => Store.getProduct(i.id) && Store.addToCart(i.id, i.variantObj || {}, i.qty));
      toast("Produk ditambahkan lagi ke keranjang", { icon: "🔁", link: "#/keranjang" });
      bumpCart();
      break;
    }
  }
});

// Input & perubahan form (urutkan, jumlah, pilihan checkout)
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "sort-select") {
    const { params } = parseHash();
    go("/katalog" + buildQS(params, { sort: t.value === "relevan" ? "" : t.value }), true);
  }
  if (t.id === "pd-qty") {
    const p = Store.getProduct(pdState.id);
    pdState.qty = Math.max(1, Math.min(p.stock, parseInt(t.value) || 1));
    render(false);
  }
  if (t.dataset.action === "cart-qty-input") {
    Store.updateQty(t.dataset.key, parseInt(t.value) || 1);
    render(false);
  }
  if (t.name === "shipping" || t.name === "payment") {
    checkoutState[t.name] = t.value;
    // Simpan isi form sementara agar tidak hilang saat render ulang
    const form = t.closest("form");
    const data = Object.fromEntries(new FormData(form));
    render(false);
    const newForm = document.querySelector('[data-form="checkout"]');
    for (const [k, v] of Object.entries(data)) if (newForm.elements[k] && newForm.elements[k].type !== "radio") newForm.elements[k].value = v;
  }
});

// Semua form
document.addEventListener("submit", (e) => {
  const form = e.target.closest("[data-form]");
  if (!form) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const type = form.dataset.form;

  if (type === "seller-chat") {
    sendSellerChat(data.text);
    form.reset();
    return;
  }

  if (type === "voucher") {
    const r = Store.applyVoucher(data.code || "");
    toast(r.ok ? `Voucher ${esc(data.code.toUpperCase())} berhasil dipakai!` : r.message, { icon: r.ok ? "🎉" : "⚠️" });
    // Simpan isi form checkout sebelum render ulang
    const co = document.querySelector('[data-form="checkout"]');
    const keep = co ? Object.fromEntries(new FormData(co)) : null;
    render(false);
    if (keep) {
      const nf = document.querySelector('[data-form="checkout"]');
      for (const [k, v] of Object.entries(keep)) if (nf.elements[k] && nf.elements[k].type !== "radio") nf.elements[k].value = v;
    }
  }

  if (type === "masuk" || type === "daftar") {
    const err = document.getElementById("auth-err");
    if (!data.email || !data.password || (type === "daftar" && !data.name)) {
      err.textContent = "Lengkapi semua kolom";
      return err.classList.remove("hidden");
    }
    if (data.password.length < 6) {
      err.textContent = "Kata sandi minimal 6 karakter";
      return err.classList.remove("hidden");
    }
    const r = type === "daftar" ? Store.register(data.name, data.email, data.password) : Store.login(data.email, data.password);
    if (!r.ok) {
      err.textContent = r.message;
      return err.classList.remove("hidden");
    }
    toast(type === "daftar" ? "Akun berhasil dibuat! Pakai voucher KIRANABARU 🎁" : "Berhasil masuk", { icon: "🎉" });
    render();
  }

  if (type === "checkout") {
    // Validasi alamat
    const required = { name: "Nama penerima", phone: "No. HP", street: "Alamat", city: "Kota", zip: "Kode pos" };
    for (const [k, label] of Object.entries(required)) {
      if (!String(data[k] || "").trim()) {
        form.elements[k].focus();
        return toast(`${label} wajib diisi`, { icon: "⚠️" });
      }
    }
    if (!/^(\+?62|0)8\d{7,12}$/.test(data.phone.replace(/[\s-]/g, ""))) {
      form.elements.phone.focus();
      return toast("Nomor HP tidak valid (contoh: 081234567890)", { icon: "⚠️" });
    }
    const t = calcTotals(data.shipping);
    const items = Store.cartLines().map((l) => ({
      id: l.id,
      name: l.product.name,
      price: l.product.price,
      qty: l.qty,
      variant: [l.variant.ukuran, l.variant.warna].filter(Boolean).join(", "),
      variantObj: l.variant,
    }));
    const order = Store.placeOrder({
      items,
      address: { name: data.name, phone: data.phone, street: data.street, city: data.city, zip: data.zip },
      note: data.note,
      shipping: data.shipping,
      payment: data.payment,
      voucher: t.voucher.ok ? Store.state.voucher : null,
      subtotal: t.sub,
      discount: t.discount,
      shippingCost: t.shipping,
      total: t.total,
    });
    go("/sukses/" + order.id);
  }

  if (type === "contact") {
    window.open(waLink(`Halo Kirana, saya ${data.name} (${data.contact}).\n\n${data.message}`), "_blank");
    form.reset();
    toast("Membuka WhatsApp...", { icon: "💬" });
  }
});

/* =====================================================================
   MODAL PILIH VARIAN (dari tombol + di kartu produk)
   ===================================================================== */
function openVariantModal(p) {
  const sel = {};
  const keys = variantKeys(p);
  const labels = { ukuran: "Ukuran", warna: "Warna" };
  const draw = () => {
    modalRoot.innerHTML = `
    <div class="filter-panel" data-close-modal>
      <div class="modal-sheet" role="dialog" aria-label="Pilih varian">
        <div class="modal-head">
          <div class="thumb">${thumb(p)}</div>
          <div style="flex:1"><div class="price">${formatRupiah(p.price)}</div><div class="small muted">Stok: ${p.stock}</div><div class="small" style="margin-top:2px">${esc(p.name)}</div></div>
          <button class="icon-btn" data-close-modal aria-label="Tutup">✕</button>
        </div>
        ${keys
          .map(
            (k) => `<div class="variant-group"><h4>${labels[k] || k}</h4><div class="variant-opts${isCompact(p.variants[k]) ? " compact" : ""}">${p.variants[k]
              .map((v) => `<button class="${sel[k] === v ? "active" : ""}" data-pick="${k}" data-value="${esc(v)}">${esc(v)}</button>`)
              .join("")}</div></div>`
          )
          .join("")}
        <button class="btn btn-primary btn-block" style="margin-top:16px" data-confirm ${keys.every((k) => sel[k]) ? "" : "disabled"}>Masukkan Keranjang</button>
      </div>
    </div>`;
  };
  draw();
  modalRoot.onclick = (e) => {
    const pick = e.target.closest("[data-pick]");
    if (pick) {
      sel[pick.dataset.pick] = pick.dataset.value;
      return draw();
    }
    if (e.target.closest("[data-confirm]")) {
      addToCart(p.id, { ...sel }, 1);
      return closeModal();
    }
    // Tutup jika klik tombol ✕ atau area gelap di luar sheet
    if (e.target.matches("[data-close-modal]") || e.target.closest("button[data-close-modal]")) closeModal();
  };
}

function closeModal() {
  modalRoot.innerHTML = "";
  modalRoot.onclick = null;
}

/* =====================================================================
   PANEL CHAT KIRANA AI
   ===================================================================== */
const AI_SUGGESTIONS = ["Rekomendasi buat aku", "Kado di bawah 200rb", "Sepatu putih", "Skincare untuk jerawat", "Ada voucher apa?", "Berapa ongkirnya?", "Status pesananku"];
let aiBusy = false;

function openAI(prefill = "") {
  const greeting = {
    role: "assistant",
    text: `Hai${Store.user() ? " " + Store.user().name.split(" ")[0] : ""}! 👋 Aku Kirana AI, asisten belanjamu.\nCeritakan apa yang kamu cari — misalnya budget, untuk siapa, atau warna favorit — dan aku carikan yang paling pas.`,
    products: [],
  };
  const msgs = Store.state.chat.length ? Store.state.chat : [greeting];

  modalRoot.innerHTML = `
  <div class="ai-panel" data-close-ai>
    <div class="ai-sheet" role="dialog" aria-label="Kirana AI">
      <div class="ai-head">
        <span class="bot">✨</span>
        <div><b>Kirana AI</b><small>${CONFIG.aiEndpoint ? "Ditenagai Claude" : "Asisten belanja pintar"} · online</small></div>
        <button class="icon-btn" data-ai-clear title="Hapus percakapan" aria-label="Hapus percakapan" style="margin-left:auto">🗑️</button>
        <button class="icon-btn" data-close-ai aria-label="Tutup" style="margin-left:0">✕</button>
      </div>
      <div class="ai-msgs" id="ai-msgs"></div>
      <div class="ai-suggest">${AI_SUGGESTIONS.map((s) => `<button data-ai-suggest="${esc(s)}">${esc(s)}</button>`).join("")}</div>
      <form class="ai-input" id="ai-form">
        <input class="input" id="ai-text" placeholder="Tanya apa saja..." autocomplete="off" value="${esc(prefill)}" aria-label="Pesan" />
        <button class="btn btn-primary" type="submit" aria-label="Kirim">➤</button>
      </form>
    </div>
  </div>`;

  const box = document.getElementById("ai-msgs");
  let history = [...msgs];

  const msgHTML = (m) => `
    <div class="msg ${m.role === "user" ? "user" : "bot"}">${esc(m.text)}${
      m.products && m.products.length
        ? `<div class="msg-products">${m.products
            .map((id) => Store.getProduct(id))
            .filter(Boolean)
            .map((p) => productCard(p, { compact: true }))
            .join("")}</div>`
        : ""
    }</div>`;

  const draw = () => {
    box.innerHTML = history.map(msgHTML).join("");
    box.scrollTop = box.scrollHeight;
  };
  draw();

  async function send(text) {
    text = text.trim();
    if (!text || aiBusy) return;
    aiBusy = true;
    history.push({ role: "user", text, products: [] });
    draw();
    box.insertAdjacentHTML("beforeend", `<div class="msg bot typing" id="typing"><span></span><span></span><span></span></div>`);
    box.scrollTop = box.scrollHeight;
    try {
      const r = await ShopiaAI.chat(text, history.slice(0, -1));
      history.push({ role: "assistant", text: r.text, products: r.products.map((p) => p.id) });
    } catch (err) {
      history.push({ role: "assistant", text: "Maaf, terjadi gangguan. Coba lagi sebentar ya 🙏", products: [] });
    }
    aiBusy = false;
    Store.saveChat(history);
    draw();
  }

  document.getElementById("ai-form").onsubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById("ai-text");
    send(input.value);
    input.value = "";
  };

  modalRoot.onclick = (e) => {
    const sug = e.target.closest("[data-ai-suggest]");
    if (sug) return send(sug.dataset.aiSuggest);
    if (e.target.closest("[data-ai-clear]")) {
      Store.saveChat([]);
      history = [greeting];
      return draw();
    }
    // Klik produk di chat -> tutup panel & buka produk
    if (e.target.closest(".product-card a")) return closeModal();
    if (e.target.matches("[data-close-ai]") || e.target.closest("button[data-close-ai]")) closeModal();
  };

  // Jika dibuka dengan pertanyaan otomatis, langsung kirim
  if (prefill) {
    document.getElementById("ai-text").value = "";
    send(prefill);
  } else setTimeout(() => document.getElementById("ai-text")?.focus(), 50);
}

// Tutup modal dengan tombol Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalRoot.innerHTML) closeModal();
});

/* =====================================================================
   PENCARIAN HEADER (saran langsung saat mengetik)
   ===================================================================== */
const searchInput = document.getElementById("search-input");
const suggestBox = document.getElementById("search-suggest");

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();
  if (q.length < 2) return suggestBox.classList.add("hidden");
  const { products } = ShopiaAI.search(q, 5);
  suggestBox.innerHTML =
    `<div class="hint">✨ Tekan Enter untuk pencarian AI: "${esc(q)}"</div>` +
    (products.length
      ? products.map((p) => `<a href="#/produk/${p.id}"><span>${p.emoji}</span><span style="flex:1">${esc(p.name)}</span><b style="color:var(--primary)">${formatRupiah(p.price)}</b></a>`).join("")
      : `<a href="#" data-open-ai data-prefill="${esc(q)}">🤖 Tanya Kirana AI tentang "${esc(q)}"</a>`);
  suggestBox.classList.remove("hidden");
});

document.getElementById("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  suggestBox.classList.add("hidden");
  searchInput.blur();
  Store.trackSearch(q);
  go("/katalog" + (q ? "?q=" + encodeURIComponent(q) : ""));
});

document.getElementById("search-ai").addEventListener("click", () => {
  suggestBox.classList.add("hidden");
  openAI(searchInput.value.trim());
});

// Sembunyikan saran saat klik di luar
document.addEventListener("click", (e) => {
  if (!e.target.closest("#search")) suggestBox.classList.add("hidden");
});

/* =====================================================================
   TIMER: banner otomatis & hitung mundur flash sale
   ===================================================================== */
let slide = 0;
setInterval(() => {
  const track = document.getElementById("banner-track");
  if (!track) return;
  slide = (slide + 1) % BANNERS.length;
  showSlide(slide);
}, 5000);

function showSlide(i) {
  const track = document.getElementById("banner-track");
  if (!track) return;
  slide = i;
  track.style.transform = `translateX(-${i * 100}%)`;
  document.querySelectorAll("#banner-dots button").forEach((b, j) => b.classList.toggle("active", j === i));
}
document.addEventListener("click", (e) => {
  const dot = e.target.closest("[data-slide]");
  if (dot) showSlide(Number(dot.dataset.slide));
});

function tickCountdown() {
  const els = document.querySelectorAll("[data-countdown]");
  if (!els.length) return;
  const now = new Date();
  const end = new Date();
  end.setHours(CONFIG.flashSaleEndHour, 59, 59, 999);
  if (end < now) end.setDate(end.getDate() + 1);
  const diff = Math.max(0, end - now);
  const pad = (n) => String(n).padStart(2, "0");
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  els.forEach((el) => (el.innerHTML = `<b>${pad(h)}</b>:<b>${pad(m)}</b>:<b>${pad(s)}</b>`));
}
setInterval(tickCountdown, 1000);

/* =====================================================================
   APLIKASI (PWA): install ke layar HP & bisa dibuka offline
   ===================================================================== */
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let installPrompt = null; // event dari Chrome/Android untuk memunculkan dialog install

// Ajakan install tidak muncul lagi selama 7 hari setelah ditutup
function installDismissedRecently() {
  try {
    return Date.now() - Number(localStorage.getItem("shopia_install_dismissed") || 0) < 7 * 864e5;
  } catch (e) {
    return false;
  }
}

function showInstallBar() {
  if (isStandalone() || installDismissedRecently()) return;
  document.getElementById("install-bar").classList.remove("hidden");
}

// Android / Chrome / Edge: browser memberi tahu bahwa aplikasi bisa di-install
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  setTimeout(showInstallBar, 4000); // tunggu sebentar agar tidak mengganggu
});

// iPhone/iPad (Safari) tidak punya tombol install otomatis -> tampilkan panduan
if (isIOS() && !isStandalone()) setTimeout(showInstallBar, 6000);

window.addEventListener("appinstalled", () => {
  document.getElementById("install-bar").classList.add("hidden");
  toast("Kirana berhasil di-install! Cek layar utama HP-mu 🎉", { icon: "📲" });
});

async function installApp() {
  document.getElementById("install-bar").classList.add("hidden");
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    return;
  }
  // Panduan manual (iPhone atau browser yang tidak mendukung dialog install)
  const ios = isIOS();
  modalRoot.innerHTML = `
  <div class="filter-panel" data-close-modal>
    <div class="modal-sheet" role="dialog" aria-label="Cara install Kirana">
      <div class="modal-head" style="align-items:center">
        <img src="icons/icon-192.png" alt="" width="56" height="56" style="border-radius:14px" />
        <div style="flex:1"><b>Install aplikasi Kirana</b><div class="small muted">Gratis, tidak memakan banyak memori</div></div>
        <button class="icon-btn" data-close-modal aria-label="Tutup">✕</button>
      </div>
      <ol class="ios-steps">
        ${
          ios
            ? `<li><b class="n">1</b><span>Tekan tombol <b>Bagikan</b> (kotak dengan panah ke atas ⬆️) di Safari</span></li>
               <li><b class="n">2</b><span>Geser ke bawah, pilih <b>Tambah ke Layar Utama</b> ➕</span></li>
               <li><b class="n">3</b><span>Tekan <b>Tambah</b>. Ikon Kirana muncul di layar HP</span></li>`
            : `<li><b class="n">1</b><span>Tekan menu <b>⋮</b> di pojok kanan atas browser</span></li>
               <li><b class="n">2</b><span>Pilih <b>Install aplikasi</b> atau <b>Tambahkan ke layar utama</b></span></li>
               <li><b class="n">3</b><span>Tekan <b>Install</b>. Ikon Kirana muncul di layar HP</span></li>`
        }
      </ol>
    </div>
  </div>`;
  modalRoot.onclick = (e) => {
    if (e.target.matches("[data-close-modal]") || e.target.closest("button[data-close-modal]")) closeModal();
  };
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action=install-app], [data-action=install-dismiss]");
  if (!el) return;
  if (el.dataset.action === "install-app") return installApp();
  document.getElementById("install-bar").classList.add("hidden");
  try {
    localStorage.setItem("shopia_install_dismissed", String(Date.now()));
  } catch (err) {}
});

// Daftarkan service worker (hanya jalan di https atau localhost)
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch((err) => console.warn("Service worker gagal:", err)));
}

/* =====================================================================
   MULAI APLIKASI
   ===================================================================== */
document.getElementById("year").textContent = new Date().getFullYear();
window.addEventListener("hashchange", () => {
  closeModal();
  render();
});
updateBadges();
render();
