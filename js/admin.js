/* =====================================================================
   SHOPIA - DASBOR PENJUAL (ADMIN)
   ---------------------------------------------------------------------
   Halaman #/admin untuk menambah, mengubah, dan menghapus produk,
   termasuk upload foto langsung dari galeri HP.

   Cara kerja:
   - Produk & foto disimpan ke repo GitHub (CONFIG.github di data.js)
     memakai "token" GitHub milik penjual. Setelah disimpan, GitHub Pages
     memperbarui website dalam beberapa menit.
   - Token hanya disimpan di HP/browser penjual ini, tidak pernah ikut
     ke website. Tanpa token, tidak ada yang bisa mengubah produk.
   - Foto otomatis dikecilkan (maks. 1200px, JPG) agar website tetap cepat.
   ===================================================================== */

const Admin = (() => {
  const LS_KEY = "shopia_admin_token";
  const PRODUCTS_FILE = "js/products.js";
  const IMAGE_DIR = "images/products";
  const MAX_PHOTOS = 6;
  const gh = CONFIG.github || {};

  // Status halaman admin
  const st = {
    token: readToken(),
    products: null, // daftar produk terbaru dari GitHub
    loading: false,
    saving: false,
    error: "",
    view: "list", // "list" atau "form"
    draft: null, // produk yang sedang diisi/diedit
    photos: [], // foto: { path } (sudah ada) atau { dataUrl, base64 } (baru)
    query: "",
  };

  function readToken() {
    try {
      return localStorage.getItem(LS_KEY) || "";
    } catch (e) {
      return "";
    }
  }
  function writeToken(t) {
    try {
      if (t) localStorage.setItem(LS_KEY, t);
      else localStorage.removeItem(LS_KEY);
    } catch (e) {}
    st.token = t;
  }

  const rerender = () => render(false);

  /* ---------- Komunikasi dengan GitHub ---------- */
  async function api(path, options = {}) {
    const res = await fetch("https://api.github.com" + path, {
      ...options,
      headers: {
        Authorization: `Bearer ${st.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!res.ok) {
      const err = new Error(`GitHub ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  const repoPath = `/repos/${gh.owner}/${gh.repo}`;

  // Teks <-> base64 (aman untuk huruf/emoji)
  function textToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function base64ToText(b64) {
    const bin = atob(b64.replace(/\s/g, ""));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }

  // Baca isi js/products.js (berlaku juga jika file diedit manual)
  function parseProductsFile(text) {
    const list = new Function(text + "\n;return PRODUCTS;")();
    if (!Array.isArray(list)) throw new Error("Format products.js tidak valid");
    return list;
  }

  function buildProductsFile(list) {
    return `/* =====================================================================
   SHOPIA - DAFTAR PRODUK
   ---------------------------------------------------------------------
   Cara termudah menambah/mengubah produk: buka halaman Admin di website
   (menu Akun -> Dasbor Penjual, atau alamat #/admin). Foto bisa langsung
   diupload dari galeri HP dan file ini diperbarui otomatis.

   Boleh juga diedit manual. Keterangan setiap field ada di js/data.js.
   ===================================================================== */
const PRODUCTS = ${JSON.stringify(list, null, 2)};
`;
  }

  async function fetchProducts() {
    const f = await api(`${repoPath}/contents/${PRODUCTS_FILE}?ref=${encodeURIComponent(gh.branch)}`);
    return parseProductsFile(base64ToText(f.content));
  }

  // Simpan beberapa file sekaligus dalam SATU commit.
  // files: [{ path, base64 }] untuk file baru/berubah, [{ path, remove: true }] untuk hapus.
  // mutate(list): mengubah daftar produk terbaru (diambil ulang tepat sebelum disimpan).
  async function commit(message, files, mutate) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const ref = await api(`${repoPath}/git/ref/heads/${gh.branch}`);
      const head = await api(`${repoPath}/git/commits/${ref.object.sha}`);
      const latest = await fetchProducts();
      const updated = mutate(latest);

      const tree = [];
      for (const f of files) {
        if (f.remove) tree.push({ path: f.path, mode: "100644", type: "blob", sha: null });
        else {
          const blob = await api(`${repoPath}/git/blobs`, { method: "POST", body: JSON.stringify({ content: f.base64, encoding: "base64" }) });
          tree.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
        }
      }
      tree.push({ path: PRODUCTS_FILE, mode: "100644", type: "blob", content: buildProductsFile(updated) });

      const newTree = await api(`${repoPath}/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
      const newCommit = await api(`${repoPath}/git/commits`, {
        method: "POST",
        body: JSON.stringify({ message, tree: newTree.sha, parents: [head.sha] }),
      });
      try {
        await api(`${repoPath}/git/refs/heads/${gh.branch}`, { method: "PATCH", body: JSON.stringify({ sha: newCommit.sha }) });
        return updated;
      } catch (e) {
        // Ada perubahan lain di saat bersamaan -> ulangi sekali dengan data terbaru
        if (e.status !== 422 || attempt === 1) throw e;
      }
    }
  }

  function errorText(e) {
    if (e.status === 401) return "Token tidak valid atau sudah kedaluwarsa. Buat token baru.";
    if (e.status === 403) return "Token tidak punya izin menulis. Pastikan izin Contents = Read and write.";
    if (e.status === 404) return "Repo atau branch tidak ditemukan. Pastikan token diberi akses ke repo " + gh.repo + ".";
    if (e.status === 409 || e.status === 422) return "Gagal menyimpan karena ada perubahan bersamaan. Coba lagi.";
    if (e instanceof TypeError) return "Tidak ada koneksi internet.";
    return "Terjadi kesalahan: " + e.message;
  }

  async function refresh() {
    st.loading = true;
    st.error = "";
    rerender();
    try {
      st.products = await fetchProducts();
      syncLocal(st.products);
    } catch (e) {
      st.error = errorText(e);
    }
    st.loading = false;
    rerender();
  }

  // Samakan daftar produk di halaman ini dengan data terbaru (tanpa menunggu website diperbarui)
  function syncLocal(list) {
    PRODUCTS.splice(0, PRODUCTS.length, ...list);
  }

  /* ---------- Foto: kecilkan di HP sebelum diupload ---------- */
  function compressImage(file, maxSize = 1200, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Gagal membaca foto"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Format foto tidak didukung"));
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff"; // latar putih untuk foto PNG transparan
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve({ dataUrl, base64: dataUrl.split(",")[1] });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Formulir produk ---------- */
  const splitList = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
  const newId = () => "p" + Date.now().toString(36);

  function openForm(product = null) {
    const p = product || {};
    st.draft = {
      id: p.id || "",
      name: p.name || "",
      category: p.category || CATEGORIES[0].id,
      price: p.price || "",
      originalPrice: p.originalPrice && p.originalPrice !== p.price ? p.originalPrice : "",
      stock: p.stock ?? "",
      description: p.description || "",
      ukuran: ((p.variants && p.variants.ukuran) || []).join(", "),
      warna: ((p.variants && p.variants.warna) || []).join(", "),
      tags: (p.tags || []).join(", "),
      flashSale: !!p.flashSale,
    };
    st.photos = (p.images || []).map((path) => ({ path }));
    st.view = "form";
    st.error = "";
    rerender();
    window.scrollTo(0, 0);
  }

  async function save() {
    const d = st.draft;
    const price = Math.round(Number(d.price));
    const stock = Math.round(Number(d.stock));
    if (!d.name.trim()) return toast("Nama produk wajib diisi", { icon: "⚠️" });
    if (!price || price < 100) return toast("Harga jual belum benar", { icon: "⚠️" });
    if (d.stock === "" || stock < 0) return toast("Stok belum diisi", { icon: "⚠️" });
    if (!st.photos.length && !confirm("Belum ada foto. Simpan tanpa foto?")) return;

    st.saving = true;
    rerender();
    const isNew = !d.id;
    const id = d.id || newId();
    const old = (st.products || []).find((p) => p.id === id) || {};
    const stamp = Date.now().toString(36);

    // Foto baru diberi nama unik; foto lama tetap dipakai
    const files = [];
    const images = st.photos.map((ph, i) => {
      if (ph.path) return ph.path;
      const path = `${IMAGE_DIR}/${id}-${stamp}-${i + 1}.jpg`;
      files.push({ path, base64: ph.base64 });
      return path;
    });
    // Foto lama yang dihapus dari produk -> hapus juga dari repo
    (old.images || [])
      .filter((path) => path.startsWith(IMAGE_DIR + "/") && !images.includes(path))
      .forEach((path) => files.push({ path, remove: true }));

    const cat = CATEGORIES.find((c) => c.id === d.category) || {};
    const originalPrice = Math.round(Number(d.originalPrice)) || price;
    const autoTags = d.name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
    const product = {
      ...old,
      id,
      name: d.name.trim(),
      category: d.category,
      price,
      originalPrice: Math.max(originalPrice, price),
      rating: old.rating ?? 0,
      sold: old.sold ?? 0,
      stock,
      emoji: old.emoji || cat.icon || "🛍️",
      color: old.color || ["#ede9fe", "#c4b5fd"],
      images,
      variants: { ukuran: splitList(d.ukuran), warna: splitList(d.warna) },
      tags: splitList(d.tags).length ? splitList(d.tags).map((t) => t.toLowerCase()) : [...new Set(autoTags)],
      createdAt: old.createdAt || new Date().toISOString().slice(0, 10),
      flashSale: !!d.flashSale,
      description: d.description.trim(),
      reviews: old.reviews || [],
    };

    try {
      const updated = await commit(`${isNew ? "Tambah" : "Ubah"} produk: ${product.name}`, files, (list) => {
        const i = list.findIndex((p) => p.id === id);
        if (i >= 0) list[i] = product;
        else list.unshift(product);
        return list;
      });
      st.products = updated;
      // Pakai foto lokal untuk pratinjau sampai website selesai diperbarui
      st.photos.forEach((ph, i) => ph.dataUrl && previewCache.set(images[i], ph.dataUrl));
      syncLocal(updated);
      st.view = "list";
      st.draft = null;
      st.photos = [];
      toast(`<b>${esc(product.name)}</b> tersimpan! Tampil untuk pembeli dalam beberapa menit.`, { icon: "✅" });
    } catch (e) {
      toast(errorText(e), { icon: "⚠️" });
    }
    st.saving = false;
    rerender();
  }

  async function remove(id) {
    const p = st.products.find((x) => x.id === id);
    if (!p || !confirm(`Hapus "${p.name}" dari toko?`)) return;
    st.saving = true;
    rerender();
    try {
      const files = (p.images || []).filter((path) => path.startsWith(IMAGE_DIR + "/")).map((path) => ({ path, remove: true }));
      st.products = await commit(`Hapus produk: ${p.name}`, files, (list) => list.filter((x) => x.id !== id));
      syncLocal(st.products);
      toast(`"${esc(p.name)}" dihapus`, { icon: "🗑️" });
    } catch (e) {
      toast(errorText(e), { icon: "⚠️" });
    }
    st.saving = false;
    rerender();
  }

  // Simpan pratinjau foto yang baru diupload (sebelum GitHub Pages selesai)
  const previewCache = new Map();
  const imgSrc = (path) => previewCache.get(path) || path;

  /* ---------- Tampilan ---------- */
  function setupView() {
    const tokenUrl = "https://github.com/settings/personal-access-tokens/new";
    return `
    <div style="max-width:560px;margin:0 auto">
      <div class="hero-info"><h1>🏪 Dasbor Penjual</h1><p>Tambah produk dan upload foto langsung dari HP. Hubungkan sekali saja dengan akun GitHub tempat website ini disimpan.</p></div>
      <div class="card step" style="margin-top:14px">
        <h3>Cara menghubungkan (sekali saja)</h3>
        <ol class="ios-steps">
          <li><b class="n">1</b><span>Buka <a href="${tokenUrl}" target="_blank" rel="noopener" style="color:var(--primary);font-weight:700">halaman pembuatan token GitHub</a> (login jika diminta)</span></li>
          <li><b class="n">2</b><span><b>Token name:</b> Shopia Admin. <b>Expiration:</b> pilih 1 tahun (atau sesuai keinginan)</span></li>
          <li><b class="n">3</b><span><b>Repository access:</b> Only select repositories → pilih <b>${esc(gh.repo)}</b></span></li>
          <li><b class="n">4</b><span><b>Permissions → Contents:</b> ubah menjadi <b>Read and write</b></span></li>
          <li><b class="n">5</b><span>Tekan <b>Generate token</b>, salin kodenya (diawali <code>github_pat_</code>), lalu tempel di bawah</span></li>
        </ol>
        <form data-admin-form="token" class="form-grid" style="margin-top:14px">
          <label>Token GitHub<input class="input" name="token" type="password" autocomplete="off" placeholder="github_pat_..." required /></label>
          ${st.error ? `<p class="voucher-err">${esc(st.error)}</p>` : ""}
          <button class="btn btn-primary btn-block" type="submit" ${st.loading ? "disabled" : ""}>${st.loading ? "Memeriksa..." : "Hubungkan"}</button>
          <p class="small muted">🔒 Token hanya disimpan di HP ini dan hanya bisa mengubah repo ${esc(gh.repo)}. Jangan bagikan token ke siapa pun.</p>
        </form>
      </div>
    </div>`;
  }

  function listView() {
    if (!st.products) {
      return `<h1 class="page-title">🏪 Dasbor Penjual</h1>${
        st.error
          ? `<div class="card step"><p class="voucher-err">${esc(st.error)}</p><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-primary" data-admin="refresh">Coba lagi</button><button class="btn btn-outline" data-admin="logout">Ganti token</button></div></div>`
          : `<div class="empty"><div class="big">⏳</div><p class="muted">Memuat produk...</p></div>`
      }`;
    }
    const q = st.query.toLowerCase();
    const list = st.products.filter((p) => !q || p.name.toLowerCase().includes(q));
    const lowStock = st.products.filter((p) => p.stock <= 5).length;
    const totalStock = st.products.reduce((n, p) => n + (Number(p.stock) || 0), 0);
    const stockValue = st.products.reduce((n, p) => n + (Number(p.stock) || 0) * (Number(p.price) || 0), 0);

    // Grafik: ungu = total stok, hijau = jumlah produk, per kategori
    const perCat = CATEGORIES.map((c) => {
      const items = st.products.filter((p) => p.category === c.id);
      return { c, count: items.length, stock: items.reduce((n, p) => n + (Number(p.stock) || 0), 0) };
    });
    const maxStock = Math.max(1, ...perCat.map((x) => x.stock));
    const maxCount = Math.max(1, ...perCat.map((x) => x.count));

    // Catatan otomatis dari data produk (aturan sederhana, bukan model AI)
    const tips = [];
    const empty = st.products.filter((p) => p.stock <= 0);
    const noPhoto = st.products.filter((p) => !(p.images || []).length);
    const top = perCat.slice().sort((a, b) => b.count - a.count)[0];
    if (empty.length) tips.push(`${empty.length} produk stoknya habis. Tambah stok agar tetap bisa dibeli.`);
    else if (lowStock) tips.push(`${lowStock} produk stoknya tinggal 5 atau kurang. Siapkan stok tambahan.`);
    if (noPhoto.length) tips.push(`${noPhoto.length} produk belum punya foto asli. Foto nyata membuat pembeli lebih percaya.`);
    if (top && top.count) tips.push(`Kategori terbanyak: ${top.c.icon} ${top.c.name} (${top.count} produk).`);
    if (!tips.length) tips.push("Stok dan foto produkmu sudah rapi. Pertahankan!");

    const status = (n) => (n <= 0 ? `<span class="status out">Habis</span>` : n <= 5 ? `<span class="status low">Menipis</span>` : `<span class="status ok">Aman</span>`);

    return `
    <div class="dash-head">
      <div><div class="hello">Halo 👋</div><h1>Dasbor Penjual</h1></div>
      <div style="display:flex;gap:6px"><a class="btn btn-ghost" style="padding:9px 14px" href="dashboard/">📊 Penjualan</a><button class="btn btn-ghost" style="padding:9px 16px" data-admin="logout">Keluar</button></div>
    </div>
    <div class="stat-grid">
      <div class="stat"><div class="ico">📦</div><div class="lbl">Produk</div><div class="val">${st.products.length}</div></div>
      <div class="stat"><div class="ico">🧮</div><div class="lbl">Total stok</div><div class="val">${totalStock}</div></div>
      <div class="stat ${lowStock ? "warn" : ""}"><div class="ico">⚠️</div><div class="lbl">Stok menipis</div><div class="val">${lowStock}</div></div>
      <div class="stat"><div class="ico">💰</div><div class="lbl">Nilai stok</div><div class="val">${formatRupiah(stockValue)}</div></div>
    </div>
    <div class="dash-grid">
      <div class="card chart-card">
        <h3>Stok per kategori</h3>
        <div class="legend"><span><i style="background:#9184f2"></i>Stok</span><span><i style="background:#72c755"></i>Jumlah produk</span></div>
        <div class="bars" role="img" aria-label="Grafik stok per kategori">
          ${perCat.map((x) => `<div class="bar-col" title="${esc(x.c.name)}: ${x.stock} stok, ${x.count} produk"><i class="b1" style="height:${Math.round((x.stock / maxStock) * 62)}%"></i><i class="b2" style="height:${Math.round((x.count / maxCount) * 30)}%"></i></div>`).join("")}
        </div>
        <div class="bar-labels">${perCat.map((x) => `<span title="${esc(x.c.name)}">${x.c.icon}</span>`).join("")}</div>
      </div>
      <div class="insight">
        <div class="bot">✨</div>
        <h3>Catatan untuk tokomu</h3>
        <p class="small muted">Dihitung otomatis dari stok & foto produk</p>
        <ul>${tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      </div>
    </div>
    <div class="list-head">
      <h2>Daftar produk</h2>
      <button class="btn btn-primary" style="padding:10px 16px" data-admin="new" ${st.saving ? "disabled" : ""}>＋ Tambah Produk</button>
    </div>
    <input class="input" placeholder="🔍 Cari produk..." value="${esc(st.query)}" data-admin-search aria-label="Cari produk" />
    ${st.saving ? `<p class="small" style="margin-top:10px;color:var(--primary)">⏳ Menyimpan perubahan...</p>` : ""}
    <div style="margin-top:12px">
      ${list
        .map(
          (p) => `
        <div class="cart-item">
          <div class="thumb">${p.images && p.images.length ? `<img class="thumb-img" src="${esc(imgSrc(p.images[0]))}" alt="" loading="lazy" />` : thumb(p)}</div>
          <div class="body">
            <div class="name">${esc(p.name)}</div>
            <span class="small muted">${esc(categoryName(p.category))} · ${(p.images || []).length} foto</span>
            <span class="price" style="font-size:.95rem">${formatRupiah(p.price)}</span>
            <div class="row">
              <span class="small" style="display:flex;gap:6px;align-items:center;color:var(--muted)">Stok ${p.stock} ${status(Number(p.stock) || 0)}</span>
              <div style="display:flex;gap:6px">
                <button class="btn btn-ghost" style="padding:6px 12px;font-size:.8rem" data-admin="edit" data-id="${esc(p.id)}" ${st.saving ? "disabled" : ""}>✏️ Edit</button>
                <button class="btn" style="padding:6px 10px;font-size:.8rem;color:var(--danger)" data-admin="delete" data-id="${esc(p.id)}" ${st.saving ? "disabled" : ""}>🗑️</button>
              </div>
            </div>
          </div>
        </div>`
        )
        .join("") || `<p class="muted small" style="text-align:center;padding:20px">Produk tidak ditemukan</p>`}
    </div>
    <p class="small muted" style="text-align:center;margin-top:8px">Perubahan tampil untuk pembeli dalam beberapa menit setelah disimpan.</p>`;
  }

  function formView() {
    const d = st.draft;
    return `
    <div class="section-head" style="margin-top:18px"><h1 class="page-title" style="margin:0">${d.id ? "Edit Produk" : "Tambah Produk"}</h1><button class="btn btn-ghost" style="padding:8px 12px" data-admin="cancel" ${st.saving ? "disabled" : ""}>Batal</button></div>
    <form data-admin-form="product" novalidate>
      <div class="card step">
        <h3>📷 Foto Produk <span class="small muted" style="font-weight:400">(${st.photos.length}/${MAX_PHOTOS}, foto pertama jadi sampul)</span></h3>
        <p class="small muted" style="margin:-4px 0 10px">📷 <b>Kamera</b> untuk memotret langsung, 🖼️ <b>Galeri</b> untuk memilih foto yang sudah ada. Tips: foto di tempat terang dengan latar polos.</p>
        <div class="admin-photos">
          ${st.photos
            .map(
              (ph, i) => `
            <div class="admin-photo">
              <img src="${esc(ph.dataUrl || imgSrc(ph.path))}" alt="Foto ${i + 1}" />
              ${i === 0 ? `<span class="cover">Sampul</span>` : `<button type="button" class="make-cover" data-admin="cover" data-i="${i}">Jadikan sampul</button>`}
              <button type="button" class="del" data-admin="photo-del" data-i="${i}" aria-label="Hapus foto">✕</button>
            </div>`
            )
            .join("")}
          ${
            st.photos.length < MAX_PHOTOS
              ? `<label class="admin-photo add"><input type="file" accept="image/*" capture="environment" hidden data-admin-file /><span>📷</span>Kamera</label>
                 <label class="admin-photo add"><input type="file" accept="image/*" multiple hidden data-admin-file /><span>🖼️</span>Galeri</label>`
              : ""
          }
        </div>
      </div>

      <div class="card step">
        <h3>📝 Info Produk</h3>
        <div class="form-grid two">
          <label class="full">Nama produk<input class="input" name="name" value="${esc(d.name)}" placeholder="Contoh: Kemeja Flanel Pria" required /></label>
          <label>Kategori<select class="input" name="category">${CATEGORIES.map((c) => `<option value="${c.id}" ${d.category === c.id ? "selected" : ""}>${c.icon} ${c.name}</option>`).join("")}</select></label>
          <label>Stok<input class="input" name="stock" type="number" inputmode="numeric" min="0" value="${esc(d.stock)}" placeholder="20" /></label>
          <label>Harga jual (Rp)<input class="input" name="price" type="number" inputmode="numeric" min="0" value="${esc(d.price)}" placeholder="120000" /></label>
          <label>Harga coret (opsional)<input class="input" name="originalPrice" type="number" inputmode="numeric" min="0" value="${esc(d.originalPrice)}" placeholder="150000" /></label>
          <label class="full">Deskripsi<textarea class="input" name="description" rows="4" placeholder="Bahan, ukuran, keunggulan produk...">${esc(d.description)}</textarea></label>
        </div>
      </div>

      <div class="card step">
        <h3>🎨 Varian <span class="small muted" style="font-weight:400">(opsional, pisahkan dengan koma)</span></h3>
        <div class="form-grid two">
          <label>Ukuran<input class="input" name="ukuran" value="${esc(d.ukuran)}" placeholder="S, M, L, XL" /></label>
          <label>Warna<input class="input" name="warna" value="${esc(d.warna)}" placeholder="Hitam, Putih, Navy" /></label>
          <label class="full">Kata kunci pencarian (opsional)<input class="input" name="tags" value="${esc(d.tags)}" placeholder="kemeja, flanel, kerja" /></label>
          <label class="option full" style="margin:0"><input type="checkbox" name="flashSale" ${d.flashSale ? "checked" : ""} /><div class="grow"><b>⚡ Ikut Flash Sale</b><div class="small muted">Tampil di bagian Flash Sale beranda</div></div></label>
        </div>
      </div>

      <button class="btn btn-primary btn-block" type="submit" ${st.saving ? "disabled" : ""}>${st.saving ? "⏳ Menyimpan & mengupload foto..." : "💾 Simpan Produk"}</button>
    </form>`;
  }

  function page() {
    if (!gh.owner || !gh.repo || !gh.branch) return emptyState("⚙️", "Admin belum diatur", "Isi CONFIG.github di js/data.js terlebih dahulu.");
    if (!st.token) return setupView();
    if (!st.products && !st.loading && !st.error) setTimeout(refresh, 0);
    return st.view === "form" && st.draft ? formView() : listView();
  }

  /* ---------- Interaksi ---------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-admin]");
    if (!el) return;
    const a = el.dataset.admin;
    if (a === "refresh") refresh();
    if (a === "logout") {
      if (!confirm("Keluar dari Dasbor Penjual di HP ini?")) return;
      writeToken("");
      st.products = null;
      st.error = "";
      st.view = "list";
      rerender();
    }
    if (a === "new") openForm();
    if (a === "edit") openForm(st.products.find((p) => p.id === el.dataset.id));
    if (a === "delete") remove(el.dataset.id);
    if (a === "cancel") {
      st.view = "list";
      st.draft = null;
      st.photos = [];
      rerender();
    }
    if (a === "photo-del") {
      st.photos.splice(Number(el.dataset.i), 1);
      rerender();
    }
    if (a === "cover") {
      const [ph] = st.photos.splice(Number(el.dataset.i), 1);
      st.photos.unshift(ph);
      rerender();
    }
  });

  // Simpan isian formulir ke draft setiap kali diketik (agar tidak hilang saat tampilan diperbarui)
  document.addEventListener("input", (e) => {
    if (e.target.matches("[data-admin-search]")) {
      st.query = e.target.value;
      const pos = e.target.selectionStart;
      rerender();
      const s = document.querySelector("[data-admin-search]");
      s.focus();
      s.setSelectionRange(pos, pos);
      return;
    }
    const form = e.target.closest('[data-admin-form="product"]');
    if (form && st.draft && e.target.name) st.draft[e.target.name] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
  });

  document.addEventListener("change", async (e) => {
    const form = e.target.closest('[data-admin-form="product"]');
    if (form && st.draft && e.target.name) st.draft[e.target.name] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (!e.target.matches("[data-admin-file]")) return;
    const files = [...e.target.files].slice(0, MAX_PHOTOS - st.photos.length);
    e.target.value = ""; // agar foto yang sama bisa dipilih lagi
    if (!files.length) return;
    toast("Memproses foto...", { icon: "📷" });
    for (const f of files) {
      try {
        st.photos.push(await compressImage(f));
      } catch (err) {
        toast(`${esc(f.name)}: ${err.message}`, { icon: "⚠️" });
      }
    }
    rerender();
  });

  document.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-admin-form]");
    if (!form) return;
    e.preventDefault();
    if (form.dataset.adminForm === "product") return save();
    // Hubungkan token: cek dulu apakah bisa membaca daftar produk
    const token = new FormData(form).get("token").trim();
    if (!token) return;
    writeToken(token);
    st.loading = true;
    st.error = "";
    rerender();
    try {
      st.products = await fetchProducts();
      syncLocal(st.products);
      toast("Berhasil terhubung! Selamat berjualan 🎉", { icon: "🏪" });
      window.scrollTo(0, 0);
    } catch (err) {
      st.error = errorText(err);
      writeToken("");
    }
    st.loading = false;
    rerender();
  });

  return { page, imgSrc };
})();
