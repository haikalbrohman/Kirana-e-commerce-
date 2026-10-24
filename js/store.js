/* =====================================================================
   KIRANA - PENYIMPANAN DATA (localStorage)
   ---------------------------------------------------------------------
   Semua data pengguna (keranjang, wishlist, akun, pesanan, riwayat
   dilihat) disimpan di browser sehingga TIDAK hilang saat halaman
   dimuat ulang.

   Catatan: ini versi demo tanpa server. Untuk toko sungguhan, data akun
   dan pesanan sebaiknya disimpan di backend/database.
   ===================================================================== */

const Store = (() => {
  const KEY = "shopia_v1";

  // Nilai awal jika belum ada data tersimpan
  const defaults = {
    cart: [], // [{ key, id, variant: {ukuran, warna}, qty }]
    voucher: null, // kode voucher yang dipakai
    wishlist: [], // [productId]
    users: [], // [{ name, email, password }] - demo saja
    currentUser: null, // email pengguna yang sedang masuk
    orders: [], // riwayat pesanan
    viewed: [], // produk yang pernah dilihat (untuk rekomendasi AI)
    searches: [], // riwayat pencarian
    chat: [], // riwayat chat Kirana AI
  };

  // Ambil data dari localStorage (aman jika error / mode privat)
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
    } catch (e) {
      return { ...defaults };
    }
  }

  let state = load();
  const listeners = [];

  // Simpan ke localStorage lalu beri tahu semua komponen yang "mendengarkan"
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* abaikan jika penyimpanan diblokir */
    }
    listeners.forEach((fn) => fn(state));
  }

  const getProduct = (id) => PRODUCTS.find((p) => p.id === id);

  /* ---------- Keranjang ---------- */
  // Kunci unik item = id produk + varian, agar varian berbeda jadi baris terpisah
  const itemKey = (id, variant = {}) => `${id}|${variant.ukuran || ""}|${variant.warna || ""}`;

  function addToCart(id, variant = {}, qty = 1) {
    const product = getProduct(id);
    if (!product) return false;
    const key = itemKey(id, variant);
    const existing = state.cart.find((i) => i.key === key);
    const currentQty = existing ? existing.qty : 0;
    // Jangan melebihi stok
    const newQty = Math.min(product.stock, currentQty + qty);
    if (existing) existing.qty = newQty;
    else state.cart.push({ key, id, variant, qty: newQty });
    save();
    return true;
  }

  function updateQty(key, qty) {
    const item = state.cart.find((i) => i.key === key);
    if (!item) return;
    const product = getProduct(item.id);
    item.qty = Math.max(1, Math.min(product ? product.stock : 99, qty));
    save();
  }

  function removeFromCart(key) {
    state.cart = state.cart.filter((i) => i.key !== key);
    save();
  }

  function clearCart() {
    state.cart = [];
    state.voucher = null;
    save();
  }

  const cartCount = () => state.cart.reduce((n, i) => n + i.qty, 0);

  // Baris keranjang lengkap dengan data produk (produk yang sudah dihapus dari data diabaikan)
  const cartLines = () =>
    state.cart
      .map((i) => ({ ...i, product: getProduct(i.id) }))
      .filter((i) => i.product);

  const subtotal = () => cartLines().reduce((s, i) => s + i.product.price * i.qty, 0);

  /* ---------- Voucher ---------- */
  // Hitung potongan dari voucher. Mengembalikan { ok, discount, freeShipping, message }
  function evaluateVoucher(code, sub = subtotal()) {
    if (!code) return { ok: false, discount: 0, freeShipping: false, message: "" };
    const v = VOUCHERS.find((x) => x.code === code.trim().toUpperCase());
    if (!v) return { ok: false, discount: 0, freeShipping: false, message: "Kode voucher tidak ditemukan" };
    if (sub < v.minSpend)
      return { ok: false, discount: 0, freeShipping: false, message: `Minimal belanja ${formatRupiah(v.minSpend)}` };
    if (v.type === "percent") {
      const d = Math.min(Math.round((sub * v.value) / 100), v.maxDiscount || Infinity);
      return { ok: true, discount: d, freeShipping: false, message: v.desc, voucher: v };
    }
    if (v.type === "fixed") return { ok: true, discount: Math.min(v.value, sub), freeShipping: false, message: v.desc, voucher: v };
    return { ok: true, discount: 0, freeShipping: true, message: v.desc, voucher: v };
  }

  function applyVoucher(code) {
    const r = evaluateVoucher(code);
    if (r.ok) {
      state.voucher = r.voucher.code;
      save();
    }
    return r;
  }

  // Pasang kode tanpa validasi (syarat dicek ulang di keranjang/checkout)
  function setVoucher(code) {
    state.voucher = code;
    save();
  }

  function removeVoucher() {
    state.voucher = null;
    save();
  }

  /* ---------- Wishlist ---------- */
  function toggleWishlist(id) {
    const i = state.wishlist.indexOf(id);
    if (i >= 0) state.wishlist.splice(i, 1);
    else state.wishlist.push(id);
    save();
    return i < 0; // true = baru ditambahkan
  }
  const inWishlist = (id) => state.wishlist.includes(id);

  /* ---------- Akun (demo, disimpan lokal) ---------- */
  // Hash sederhana agar password tidak tersimpan sebagai teks biasa.
  // BUKAN keamanan sungguhan - untuk produksi gunakan backend.
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  function register(name, email, password) {
    email = email.trim().toLowerCase();
    if (state.users.some((u) => u.email === email)) return { ok: false, message: "Email sudah terdaftar" };
    state.users.push({ name: name.trim(), email, password: hash(password) });
    state.currentUser = email;
    save();
    return { ok: true };
  }

  function login(email, password) {
    email = email.trim().toLowerCase();
    const u = state.users.find((x) => x.email === email && x.password === hash(password));
    if (!u) return { ok: false, message: "Email atau kata sandi salah" };
    state.currentUser = email;
    save();
    return { ok: true };
  }

  function logout() {
    state.currentUser = null;
    save();
  }

  const user = () => state.users.find((u) => u.email === state.currentUser) || null;

  /* ---------- Pesanan ---------- */
  function placeOrder(order) {
    const id = "SHP" + Date.now().toString().slice(-8);
    const full = { id, date: new Date().toISOString(), status: "Diproses", user: state.currentUser, ...order };
    state.orders.unshift(full);
    state.cart = [];
    state.voucher = null;
    save();
    return full;
  }

  // Pesanan milik pengguna yang sedang masuk (atau tamu jika belum masuk)
  const myOrders = () => state.orders.filter((o) => o.user === state.currentUser);

  /* ---------- Riwayat (untuk personalisasi AI) ---------- */
  function trackView(id) {
    state.viewed = [id, ...state.viewed.filter((x) => x !== id)].slice(0, 20);
    save();
  }

  function trackSearch(q) {
    if (!q) return;
    state.searches = [q, ...state.searches.filter((x) => x !== q)].slice(0, 10);
    save();
  }

  function saveChat(messages) {
    state.chat = messages.slice(-30);
    save();
  }

  return {
    get state() {
      return state;
    },
    subscribe: (fn) => listeners.push(fn),
    getProduct,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    cartCount,
    cartLines,
    subtotal,
    evaluateVoucher,
    applyVoucher,
    setVoucher,
    removeVoucher,
    toggleWishlist,
    inWishlist,
    register,
    login,
    logout,
    user,
    placeOrder,
    myOrders,
    trackView,
    trackSearch,
    saveChat,
  };
})();

/* ---------- Fungsi bantu format Rupiah ---------- */
function formatRupiah(n) {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}
