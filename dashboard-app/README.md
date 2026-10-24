# Dasbor Toko Shopia

Dasbor ringkasan toko (React + TypeScript + Tailwind 4 + ikon Lucide), dibangun dari
komponen `StatCard`, `BarChart`, dan `StatusPill` di `src/components/dashboard.tsx`.

- **Alamat:** https://haikalbrohman.github.io/Shopia-e-commerce-/dashboard/
- **Data produk & stok:** asli, dibaca dari `../js/products.js` dan `../js/data.js`.
- **Pesanan:** dari riwayat checkout di perangkat yang membuka dasbor. Jika belum ada,
  dipakai data contoh yang ditandai di layar.

## Mengubah & menerbitkan

```bash
cd dashboard-app
npm install
npm run dev     # pratinjau lokal
npm run build   # hasil masuk ke ../dashboard (yang dibuka GitHub Pages)
```

Setelah `npm run build`, commit folder `dashboard/` agar perubahan tampil online.
